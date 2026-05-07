import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database, ProtocolPhase, SexType, SymptomType } from '@/lib/supabase/types'

type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

interface OnboardingPayload {
  birth_year?: number
  sex?: SexType
  conditions?: string[]
  medications?: string[]
  prior_iodine_exp?: boolean
  cofactors_in_use?: string[]
  current_symptoms?: string[]
  main_goal?: string
  phase?: ProtocolPhase
  protocol_start_date?: string
  recommended_dose_drops?: number
}

const VALID_SYMPTOMS = new Set<SymptomType>([
  'headache',
  'acne',
  'extra_fatigue',
  'breast_pain',
  'rhinitis',
  'urinary_infection',
  'bad_breath',
  'menstrual_worsening',
  'palpitations',
  'none',
  'other',
])

function normalizeSymptoms(symptoms: string[] | undefined): SymptomType[] {
  const normalized = (symptoms ?? []).map((symptom) =>
    VALID_SYMPTOMS.has(symptom as SymptomType)
      ? symptom as SymptomType
      : 'other'
  )

  return Array.from(new Set(normalized))
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: Request) {
  const payload = await request.json() as OnboardingPayload
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return jsonError('Sessão expirada. Faça login novamente.', 401)
  }

  if (
    !payload.birth_year ||
    !payload.sex ||
    !payload.phase ||
    payload.recommended_dose_drops === undefined
  ) {
    return jsonError('Dados do perfil incompletos.')
  }

  const profile: ProfileInsert = {
    user_id: user.id,
    birth_year: payload.birth_year,
    sex: payload.sex,
    conditions: payload.conditions ?? [],
    medications: payload.medications ?? [],
    prior_iodine_exp: payload.prior_iodine_exp ?? false,
    cofactors_in_use: payload.cofactors_in_use ?? [],
    current_symptoms: normalizeSymptoms(payload.current_symptoms),
    main_goal: payload.main_goal ?? null,
    phase: payload.phase,
    protocol_start_date: payload.protocol_start_date ?? new Date().toISOString().split('T')[0],
    recommended_dose_drops: payload.recommended_dose_drops,
  }

  const { data: existingProfile, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lookupError) {
    return jsonError(`Erro ao buscar perfil: ${lookupError.message}`, 500)
  }

  const profileWrite = existingProfile
    ? await supabase
      .from('profiles')
      .update(profile)
      .eq('id', existingProfile.id)
    : await supabase
      .from('profiles')
      .insert(profile)

  if (profileWrite.error) {
    return jsonError(`Erro ao salvar perfil: ${profileWrite.error.message}`, 500)
  }

  const { error: userError } = await supabase
    .from('users')
    .update({ onboarding_done: true })
    .eq('id', user.id)

  if (userError) {
    return jsonError(`Erro ao finalizar cadastro: ${userError.message}`, 500)
  }

  return NextResponse.json({ ok: true })
}
