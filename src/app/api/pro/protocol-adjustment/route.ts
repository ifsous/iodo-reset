import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendProtocolAdjustmentEmail } from '@/lib/email/transactional'
import { safeRecordOperationalEvent } from '@/lib/operational-events'
import { getAppOrigin } from '@/lib/supabase/config'
import type { Json, PlanType, ProtocolPhase } from '@/lib/supabase/types'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function parseDose(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const dose = Number(value)
  if (!Number.isInteger(dose) || dose < 0 || dose > 50) return Number.NaN
  return dose
}

function parsePhase(value: unknown): ProtocolPhase | null {
  if (value === null || value === undefined || value === '') return null
  return ['0', '1', '2', '3', '4'].includes(String(value)) ? String(value) as ProtocolPhase : null
}

export async function PATCH(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Nao autenticado.', 401)

  const body = await request.json() as {
    patient_id?: string
    custom_dose_suggestion?: number | string | null
    phase?: ProtocolPhase | string | null
    pro_notes?: string | null
  }

  const patientId = typeof body.patient_id === 'string' ? body.patient_id.trim() : ''
  if (!patientId) return jsonError('patient_id e obrigatorio.')

  const shouldUpdateDose = Object.prototype.hasOwnProperty.call(body, 'custom_dose_suggestion')
  const customDoseSuggestion = shouldUpdateDose ? parseDose(body.custom_dose_suggestion) : null
  if (Number.isNaN(customDoseSuggestion)) {
    return jsonError('Dose sugerida deve ser um numero inteiro entre 0 e 50 gotas.')
  }
  const shouldUpdatePhase = Object.prototype.hasOwnProperty.call(body, 'phase')
  const phaseSuggestion = shouldUpdatePhase ? parsePhase(body.phase) : null
  if (shouldUpdatePhase && !phaseSuggestion) {
    return jsonError('Fase sugerida invalida.')
  }

  const proNotes = typeof body.pro_notes === 'string'
    ? body.pro_notes.trim().slice(0, 2000) || null
    : null

  const { data: userData } = await supabase
    .from('users')
    .select('plan, is_professional')
    .eq('id', user.id)
    .single<{ plan: PlanType; is_professional: boolean }>()

  const hasProAccess = userData?.is_professional || userData?.plan === 'pro' || userData?.plan === 'clinic'
  if (!hasProAccess) return jsonError('Acesso profissional necessario.', 403)

  const { data: professional } = await supabase
    .from('professionals')
    .select('id, display_name')
    .eq('user_id', user.id)
    .maybeSingle<{ id: string; display_name: string }>()

  if (!professional) return jsonError('Perfil profissional nao encontrado.', 404)

  const updatePayload: {
    custom_dose_suggestion?: number | null
    pro_notes: string | null
    updated_at: string
  } = {
    pro_notes: proNotes,
    updated_at: new Date().toISOString(),
  }

  if (shouldUpdateDose) {
    updatePayload.custom_dose_suggestion = customDoseSuggestion
  }

  const { data, error } = await supabase
    .from('pro_patients')
    .update(updatePayload)
    .eq('professional_id', professional.id)
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .select('id, custom_dose_suggestion, pro_notes, updated_at')
    .single()

  if (error || !data) {
    return jsonError('Paciente nao encontrado para este profissional.', 404)
  }

  const admin = createAdminClient()
  const { data: previousProfile } = await admin
    .from('profiles')
    .select('phase, recommended_dose_drops')
    .eq('user_id', patientId)
    .maybeSingle<{ phase: ProtocolPhase; recommended_dose_drops: number }>()

  const profileUpdate: {
    phase?: ProtocolPhase
    recommended_dose_drops?: number
    updated_at: string
  } = { updated_at: new Date().toISOString() }

  if (shouldUpdatePhase && phaseSuggestion) {
    profileUpdate.phase = phaseSuggestion
  }

  if (shouldUpdateDose && customDoseSuggestion !== null) {
    profileUpdate.recommended_dose_drops = customDoseSuggestion
  }

  const shouldUpdateProfile = Boolean(profileUpdate.phase || profileUpdate.recommended_dose_drops !== undefined)

  if (shouldUpdateProfile && previousProfile) {
    const { error: profileError } = await admin
      .from('profiles')
      .update(profileUpdate)
      .eq('user_id', patientId)

    if (profileError) {
      return jsonError('Ajuste salvo no vinculo, mas nao foi possivel atualizar o perfil do paciente.', 500)
    }

    const nextPhase = profileUpdate.phase ?? previousProfile.phase
    const nextDose = profileUpdate.recommended_dose_drops ?? previousProfile.recommended_dose_drops

    await Promise.all([
      admin
        .from('protocol_progression_events')
        .insert({
          user_id: patientId,
          source: 'professional',
          actor_user_id: user.id,
          from_phase: previousProfile.phase,
          to_phase: nextPhase,
          from_dose_drops: previousProfile.recommended_dose_drops,
          to_dose_drops: nextDose,
          reason: 'Ajuste manual enviado por profissional vinculado ao paciente.',
          metadata: {
            professional_id: professional.id,
            pro_patient_id: data.id,
            has_notes: Boolean(proNotes),
          } as Json,
        }),
      admin
        .from('notifications')
        .insert({
          user_id: patientId,
          type: 'protocol_update',
          title: 'Ajuste profissional recebido',
          body: `Seu profissional atualizou seu protocolo para fase ${nextPhase} e ${nextDose} gota${nextDose === 1 ? '' : 's'}.`,
          action_url: '/dashboard',
          metadata: {
            source: 'professional',
            professional_id: professional.id,
            from_phase: previousProfile.phase,
            to_phase: nextPhase,
            from_dose_drops: previousProfile.recommended_dose_drops,
            to_dose_drops: nextDose,
          },
        }),
    ])
  }

  const guidanceMessage = proNotes?.trim()
  if (guidanceMessage) {
    const { error: guidanceError } = await admin
      .from('pro_guidance_history')
      .insert({
        professional_id: professional.id,
        patient_id: patientId,
        pro_patient_id: data.id,
        message: guidanceMessage,
        custom_dose_suggestion: data.custom_dose_suggestion,
        status: 'sent',
      })

    if (guidanceError && guidanceError.code !== '42P01') {
      await safeRecordOperationalEvent(createAdminClient(), {
        severity: 'warning',
        area: 'pro',
        eventType: 'pro_guidance_history_insert_failed',
        message: 'Orientacao profissional enviada, mas historico nao foi gravado.',
        userId: patientId,
        metadata: {
          professional_id: professional.id,
          pro_patient_id: data.id,
          error: guidanceError.message,
          code: guidanceError.code,
        },
      })
    }
  }

  const { data: patient } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', patientId)
    .maybeSingle<{ email: string; full_name: string | null }>()

  const emailDelivery = patient
    ? await sendProtocolAdjustmentEmail({
        to: patient.email,
        patientName: patient.full_name,
        professionalName: professional.display_name,
        dose: data.custom_dose_suggestion,
        notes: data.pro_notes,
        dashboardUrl: new URL('/dashboard', getAppOrigin()).toString(),
      })
    : { status: 'skipped' as const, reason: 'Paciente sem e-mail encontrado.' }

  if (emailDelivery.status !== 'sent') {
    await safeRecordOperationalEvent(admin, {
      severity: emailDelivery.status === 'failed' ? 'critical' : 'warning',
      area: 'email',
      eventType: `protocol_adjustment_${emailDelivery.status}`,
      message: emailDelivery.status === 'failed'
        ? 'Falha ao enviar e-mail de ajuste profissional.'
        : 'E-mail de ajuste profissional nao foi enviado.',
      userId: patientId,
      userEmail: patient?.email ?? null,
      metadata: {
        reason: emailDelivery.reason,
        professional_id: professional.id,
        pro_patient_id: data.id,
      },
    })
  }

  return NextResponse.json({
    ok: true,
    custom_dose_suggestion: data.custom_dose_suggestion,
    phase: phaseSuggestion ?? previousProfile?.phase ?? null,
    pro_notes: data.pro_notes,
    guidance_updated_at: data.updated_at,
    email_delivery: emailDelivery,
  })
}
