import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendProfessionalInviteEmail } from '@/lib/email/transactional'
import { safeRecordOperationalEvent } from '@/lib/operational-events'
import { getAppOrigin } from '@/lib/supabase/config'
import type { PlanType } from '@/lib/supabase/types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

async function requireProfessional() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: jsonError('Nao autenticado.', 401) }

  const { data: userData } = await supabase
    .from('users')
    .select('plan, is_professional')
    .eq('id', user.id)
    .single<{ plan: PlanType; is_professional: boolean }>()

  const hasProAccess = userData?.is_professional || userData?.plan === 'pro' || userData?.plan === 'clinic'
  if (!hasProAccess) return { error: jsonError('Acesso profissional necessario.', 403) }

  const { data: professional } = await supabase
    .from('professionals')
    .select('id, patient_limit, display_name')
    .eq('user_id', user.id)
    .maybeSingle<{ id: string; patient_limit: number; display_name: string }>()

  if (!professional) {
    return { error: jsonError('Perfil profissional nao encontrado.', 404) }
  }

  return { supabase, user, professional }
}

export async function POST(request: Request) {
  const body = await request.json() as { email?: string; pro_notes?: string; allow_email_invite?: boolean }
  const email = normalizeEmail(body.email)
  const proNotes = typeof body.pro_notes === 'string'
    ? body.pro_notes.trim().slice(0, 2000) || null
    : null

  if (!EMAIL_RE.test(email)) {
    return jsonError('Informe um email valido.')
  }

  const access = await requireProfessional()
  if (access.error) return access.error
  const { user, professional } = access

  const adminSupabase = createAdminClient()

  const { data: patient } = await adminSupabase
    .from('users')
    .select('id, email, full_name')
    .eq('email', email)
    .maybeSingle<{ id: string; email: string; full_name: string | null }>()

  if (patient?.id === user.id) {
    return jsonError('Voce nao pode convidar a propria conta.')
  }

  if (!patient && body.allow_email_invite !== true) {
    return NextResponse.json({
      error: 'Paciente nao encontrado na base local. Confirme se deseja enviar convite por email.',
      code: 'email_invite_confirmation_required',
      needs_account: true,
    }, { status: 409 })
  }

  const { count: linkedCount } = await adminSupabase
    .from('pro_patients')
    .select('*', { count: 'exact', head: true })
    .eq('professional_id', professional.id)
    .in('status', ['active', 'paused'])

  const { count: pendingInvites } = await adminSupabase
    .from('pro_invites')
    .select('*', { count: 'exact', head: true })
    .eq('professional_id', professional.id)
    .eq('status', 'pending')

  if ((linkedCount ?? 0) + (pendingInvites ?? 0) >= professional.patient_limit) {
    return jsonError('Limite de pacientes do perfil profissional atingido.', 409)
  }

  const { data: existingLink } = patient ? await adminSupabase
    .from('pro_patients')
    .select('id, status')
    .eq('professional_id', professional.id)
    .eq('patient_id', patient.id)
    .maybeSingle<{ id: string; status: string }>() : { data: null }

  if (existingLink && (existingLink.status === 'active' || existingLink.status === 'paused')) {
    return jsonError('Este paciente ja aceitou o acompanhamento desta clinica.', 409)
  }

  const { data: existingInvite } = await adminSupabase
    .from('pro_invites')
    .select('id, status')
    .eq('professional_id', professional.id)
    .eq('patient_email', email)
    .maybeSingle<{ id: string; status: string }>()

  const now = new Date().toISOString()
  const invitePayload = {
    professional_id: professional.id,
    patient_email: email,
    patient_id: patient?.id ?? null,
    status: existingInvite?.status === 'active' ? 'active' as const : 'pending' as const,
    pro_notes: proNotes,
    invite_sent_at: now,
    updated_at: now,
  }

  const { data: invite, error: inviteError } = existingInvite
    ? await adminSupabase
        .from('pro_invites')
        .update(invitePayload)
        .eq('id', existingInvite.id)
        .select('id, status')
        .single<{ id: string; status: string }>()
    : await adminSupabase
        .from('pro_invites')
        .insert(invitePayload)
        .select('id, status')
        .single<{ id: string; status: string }>()

  if (inviteError || !invite) return jsonError('Erro ao criar convite por email.', 500)

  if (patient && existingLink?.status === 'pending') {
    await adminSupabase
      .from('pro_patients')
      .update({ status: 'ended', updated_at: now })
      .eq('id', existingLink.id)
  }

  const acceptPath = `/pro/accept?invite_id=${invite.id}`
  const acceptUrl = new URL(acceptPath, getAppOrigin()).toString()

  const emailDelivery = patient
    ? { status: 'skipped' as const, reason: 'Paciente cadastrado; convite enviado por notificacao no app.' }
    : await sendProfessionalInviteEmail({
        to: email,
        patientName: null,
        professionalName: professional.display_name,
        acceptUrl,
      })
  let notificationDelivery: 'sent' | 'not_applicable' | 'pending_schema' | 'failed' = patient ? 'sent' : 'not_applicable'

  if (patient) {
    const { error: notificationError } = await adminSupabase
      .from('notifications')
      .insert({
        user_id: patient.id,
        type: 'pro_invite',
        title: 'Novo convite profissional',
        body: `${professional.display_name} quer acompanhar seu protocolo no IODO RESET.`,
        action_url: acceptPath,
        metadata: {
          invite_id: invite.id,
          professional_id: professional.id,
          professional_name: professional.display_name,
        },
      })

    if (notificationError?.code === '42P01') {
      notificationDelivery = 'pending_schema'
    } else if (notificationError) {
      notificationDelivery = 'failed'
      await safeRecordOperationalEvent(adminSupabase, {
        severity: 'warning',
        area: 'notifications',
        eventType: 'professional_invite_notification_failed',
        message: 'Convite profissional criado, mas notificacao no app nao foi gravada.',
        userId: patient.id,
        userEmail: email,
        metadata: {
          professional_id: professional.id,
          invite_id: invite.id,
          error: notificationError.message,
          code: notificationError.code,
        },
      })
    }
  }

  if (emailDelivery.status !== 'sent') {
    await safeRecordOperationalEvent(adminSupabase, {
      severity: emailDelivery.status === 'failed' ? 'critical' : 'warning',
      area: 'email',
      eventType: `professional_invite_${emailDelivery.status}`,
      message: emailDelivery.status === 'failed'
        ? 'Falha ao enviar convite profissional por e-mail.'
        : 'Convite profissional nao foi enviado por falta de configuracao.',
      userId: patient?.id ?? null,
      userEmail: email,
      metadata: {
        reason: emailDelivery.reason,
        professional_id: professional.id,
        invite_id: invite.id,
      },
    })
  }

  return NextResponse.json({
    ok: true,
    invite_id: invite.id,
    status: invite.status,
    needs_account: !patient,
    email_delivery: emailDelivery,
    notification_delivery: notificationDelivery,
    patient: patient ? { id: patient.id, email: patient.email, full_name: patient.full_name } : { email },
    accept_path: acceptPath,
  })
}

export async function PATCH(request: Request) {
  const access = await requireProfessional()
  if (access.error) return access.error
  const { professional } = access

  const body = await request.json().catch(() => ({})) as {
    invite_id?: string
    invite_ids?: string[]
    action?: 'resend' | 'cancel'
  }
  const inviteId = typeof body.invite_id === 'string' ? body.invite_id.trim() : ''
  const inviteIds = Array.isArray(body.invite_ids)
    ? body.invite_ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0).map((id) => id.trim())
    : []

  if ((!inviteId && inviteIds.length === 0) || (body.action !== 'resend' && body.action !== 'cancel')) {
    return jsonError('Acao de convite invalida.')
  }

  if (inviteIds.length > 0) {
    if (body.action !== 'cancel') return jsonError('Acao em lote aceita apenas cancelamento.')

    const now = new Date().toISOString()
    const adminSupabase = createAdminClient()
    const { data: invites, error: lookupError } = await adminSupabase
      .from('pro_invites')
      .select('id, patient_id')
      .eq('professional_id', professional.id)
      .in('id', inviteIds)
      .neq('status', 'active')
      .returns<{ id: string; patient_id: string | null }[]>()

    if (lookupError) return jsonError('Erro ao localizar convites.', 500)
    if (!invites || invites.length === 0) return jsonError('Nenhum convite pendente encontrado.', 404)

    const idsToCancel = invites.map((invite) => invite.id)
    const { error } = await adminSupabase
      .from('pro_invites')
      .update({ status: 'cancelled', updated_at: now })
      .eq('professional_id', professional.id)
      .in('id', idsToCancel)

    if (error) return jsonError('Erro ao cancelar convites.', 500)

    const patientIds = invites.map((invite) => invite.patient_id).filter((id): id is string => Boolean(id))
    if (patientIds.length > 0) {
      await adminSupabase
        .from('pro_patients')
        .update({ status: 'ended', updated_at: now })
        .eq('professional_id', professional.id)
        .in('patient_id', patientIds)
        .eq('status', 'pending')
    }

    await adminSupabase
      .from('notifications')
      .update({ status: 'archived', updated_at: now })
      .eq('type', 'pro_invite')
      .in('metadata->>invite_id', idsToCancel)

    return NextResponse.json({ ok: true, cancelled_ids: idsToCancel })
  }

  const adminSupabase = createAdminClient()
  const { data: invite } = await adminSupabase
    .from('pro_invites')
    .select('id, professional_id, patient_email, patient_id, status, pro_notes')
    .eq('id', inviteId)
    .eq('professional_id', professional.id)
    .maybeSingle<{
      id: string
      professional_id: string
      patient_email: string
      patient_id: string | null
      status: 'pending' | 'active' | 'cancelled' | 'expired'
      pro_notes: string | null
    }>()

  if (!invite) return jsonError('Convite nao encontrado.', 404)

  if (body.action === 'cancel') {
    if (invite.status === 'active') {
      return jsonError('Convite ja aceito. Encerre o vinculo pelo paciente.', 409)
    }

    const now = new Date().toISOString()
    const { data, error } = await adminSupabase
      .from('pro_invites')
      .update({ status: 'cancelled', updated_at: now })
      .eq('id', invite.id)
      .select('id, status')
      .single<{ id: string; status: string }>()

    if (error || !data) return jsonError('Erro ao cancelar convite.', 500)

    if (invite.patient_id) {
      await adminSupabase
        .from('pro_patients')
        .update({ status: 'ended' })
        .eq('professional_id', professional.id)
        .eq('patient_id', invite.patient_id)
        .eq('status', 'pending')

      await adminSupabase
        .from('notifications')
        .update({ status: 'archived', updated_at: now })
        .eq('user_id', invite.patient_id)
        .eq('type', 'pro_invite')
        .contains('metadata', { invite_id: invite.id })
    }

    return NextResponse.json({ ok: true, invite_id: invite.id, status: data.status })
  }

  if (invite.status === 'active') {
    return jsonError('Convite ja aceito.', 409)
  }

  const now = new Date().toISOString()
  const { data, error } = await adminSupabase
    .from('pro_invites')
    .update({ status: 'pending', invite_sent_at: now, updated_at: now })
    .eq('id', invite.id)
    .select('id, status')
    .single<{ id: string; status: string }>()

  if (error || !data) return jsonError('Erro ao reenviar convite.', 500)

  const acceptPath = `/pro/accept?invite_id=${invite.id}`
  const acceptUrl = new URL(acceptPath, getAppOrigin()).toString()
  const emailDelivery = invite.patient_id
    ? { status: 'skipped' as const, reason: 'Paciente cadastrado; reenvio feito por notificacao no app.' }
    : await sendProfessionalInviteEmail({
        to: invite.patient_email,
        patientName: null,
        professionalName: professional.display_name,
        acceptUrl,
      })
  let notificationDelivery: 'sent' | 'not_applicable' | 'pending_schema' | 'failed' = invite.patient_id ? 'sent' : 'not_applicable'

  if (invite.patient_id) {
    const { error: notificationError } = await adminSupabase
      .from('notifications')
      .insert({
        user_id: invite.patient_id,
        type: 'pro_invite',
        title: 'Convite profissional reenviado',
        body: `${professional.display_name} reenviou o convite para acompanhar seu protocolo.`,
        action_url: acceptPath,
        metadata: {
          invite_id: invite.id,
          professional_id: professional.id,
          professional_name: professional.display_name,
        },
      })

    if (notificationError?.code === '42P01') {
      notificationDelivery = 'pending_schema'
    } else if (notificationError) {
      notificationDelivery = 'failed'
      await safeRecordOperationalEvent(adminSupabase, {
        severity: 'warning',
        area: 'notifications',
        eventType: 'professional_invite_resend_notification_failed',
        message: 'Convite profissional reenviado, mas notificacao no app nao foi gravada.',
        userId: invite.patient_id,
        userEmail: invite.patient_email,
        metadata: {
          professional_id: professional.id,
          invite_id: invite.id,
          error: notificationError.message,
          code: notificationError.code,
        },
      })
    }
  }

  if (emailDelivery.status !== 'sent') {
    await safeRecordOperationalEvent(adminSupabase, {
      severity: emailDelivery.status === 'failed' ? 'critical' : 'warning',
      area: 'email',
      eventType: `professional_invite_resend_${emailDelivery.status}`,
      message: emailDelivery.status === 'failed'
        ? 'Falha ao reenviar convite profissional por e-mail.'
        : 'Reenvio de convite profissional pendente de configuracao.',
      userId: invite.patient_id,
      userEmail: invite.patient_email,
      metadata: {
        reason: emailDelivery.reason,
        professional_id: professional.id,
        invite_id: invite.id,
      },
    })
  }

  return NextResponse.json({
    ok: true,
    invite_id: invite.id,
    status: data.status,
    accept_path: acceptPath,
    email_delivery: emailDelivery,
    notification_delivery: notificationDelivery,
  })
}
