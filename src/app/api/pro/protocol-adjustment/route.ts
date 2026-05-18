import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PlanType } from '@/lib/supabase/types'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function parseDose(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const dose = Number(value)
  if (!Number.isInteger(dose) || dose < 0 || dose > 50) return Number.NaN
  return dose
}

export async function PATCH(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Nao autenticado.', 401)

  const body = await request.json() as {
    patient_id?: string
    custom_dose_suggestion?: number | string | null
    pro_notes?: string | null
  }

  const patientId = typeof body.patient_id === 'string' ? body.patient_id.trim() : ''
  if (!patientId) return jsonError('patient_id e obrigatorio.')

  const customDoseSuggestion = parseDose(body.custom_dose_suggestion)
  if (Number.isNaN(customDoseSuggestion)) {
    return jsonError('Dose sugerida deve ser um numero inteiro entre 0 e 50 gotas.')
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
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle<{ id: string }>()

  if (!professional) return jsonError('Perfil profissional nao encontrado.', 404)

  const { data, error } = await supabase
    .from('pro_patients')
    .update({
      custom_dose_suggestion: customDoseSuggestion,
      pro_notes: proNotes,
    })
    .eq('professional_id', professional.id)
    .eq('patient_id', patientId)
    .select('id, custom_dose_suggestion, pro_notes')
    .single()

  if (error || !data) {
    return jsonError('Paciente nao encontrado para este profissional.', 404)
  }

  return NextResponse.json({
    ok: true,
    custom_dose_suggestion: data.custom_dose_suggestion,
    pro_notes: data.pro_notes,
  })
}
