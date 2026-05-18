import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendProfessionalInviteEmail } from '@/lib/email/transactional'
import type { PlanType } from '@/lib/supabase/types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function getOrigin(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'

  if (forwardedHost) return `${proto}://${forwardedHost}`

  return new URL(request.url).origin
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Nao autenticado.', 401)

  const body = await request.json() as { email?: string; pro_notes?: string }
  const email = normalizeEmail(body.email)
  const proNotes = typeof body.pro_notes === 'string'
    ? body.pro_notes.trim().slice(0, 2000) || null
    : null

  if (!EMAIL_RE.test(email)) {
    return jsonError('Informe um email valido.')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('plan, is_professional')
    .eq('id', user.id)
    .single<{ plan: PlanType; is_professional: boolean }>()

  const hasProAccess = userData?.is_professional || userData?.plan === 'pro' || userData?.plan === 'clinic'
  if (!hasProAccess) return jsonError('Acesso profissional necessario.', 403)

  const { data: professional } = await supabase
    .from('professionals')
    .select('id, patient_limit, display_name')
    .eq('user_id', user.id)
    .maybeSingle<{ id: string; patient_limit: number; display_name: string }>()

  if (!professional) {
    return jsonError('Perfil profissional nao encontrado.', 404)
  }

  const adminSupabase = createAdminClient()

  const { data: patient } = await adminSupabase
    .from('users')
    .select('id, email, full_name')
    .eq('email', email)
    .maybeSingle<{ id: string; email: string; full_name: string | null }>()

  if (patient?.id === user.id) {
    return jsonError('Voce nao pode convidar a propria conta.')
  }

  const { count: linkedCount } = await adminSupabase
    .from('pro_patients')
    .select('*', { count: 'exact', head: true })
    .eq('professional_id', professional.id)
    .in('status', ['pending', 'active', 'paused'])

  const { count: pendingEmailInvites } = await adminSupabase
    .from('pro_invites')
    .select('*', { count: 'exact', head: true })
    .eq('professional_id', professional.id)
    .eq('status', 'pending')
    .is('patient_id', null)

  if ((linkedCount ?? 0) + (pendingEmailInvites ?? 0) >= professional.patient_limit) {
    return jsonError('Limite de pacientes do perfil profissional atingido.', 409)
  }

  const { data: existingLink } = patient ? await adminSupabase
    .from('pro_patients')
    .select('id, status')
    .eq('professional_id', professional.id)
    .eq('patient_id', patient.id)
    .maybeSingle<{ id: string; status: string }>() : { data: null }

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

  if (patient) {
    const linkResult = existingLink
      ? await adminSupabase
        .from('pro_patients')
        .update({
          status: existingLink.status === 'active' ? 'active' : 'pending',
          pro_notes: proNotes,
          invite_sent_at: now,
        })
        .eq('id', existingLink.id)
        .select('id, status')
        .single()
      : await adminSupabase
        .from('pro_patients')
        .insert({
          professional_id: professional.id,
          patient_id: patient.id,
          status: 'pending',
          pro_notes: proNotes,
          invite_sent_at: now,
        })
        .select('id, status')
        .single()

    if (linkResult.error || !linkResult.data) return jsonError('Erro ao criar vinculo do paciente.', 500)
  }

  const acceptPath = `/pro/accept?invite_id=${invite.id}`
  const acceptUrl = new URL(acceptPath, getOrigin(request)).toString()

  const emailDelivery = await sendProfessionalInviteEmail({
    to: email,
    patientName: patient?.full_name ?? null,
    professionalName: professional.display_name,
    acceptUrl,
  })

  return NextResponse.json({
    ok: true,
    invite_id: invite.id,
    status: invite.status,
    needs_account: !patient,
    email_delivery: emailDelivery,
    patient: patient ? { id: patient.id, email: patient.email, full_name: patient.full_name } : { email },
    accept_path: acceptPath,
  })
}
