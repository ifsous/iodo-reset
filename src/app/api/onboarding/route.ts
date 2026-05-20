import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database, ProgressionStrategy, ProtocolPhase, ProtocolRiskLevel, SexType, SymptomType } from '@/lib/supabase/types'
import { calculateProtocol, examScheduleToJson } from '@/lib/protocol/protocolRules'

type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

interface OnboardingPayload {
  birth_year?: number
  sex?: SexType
  conditions?: string[]
  medications?: string[]
  prior_iodine_exp?: boolean
  cofactors_in_use?: string[]
  safety_flags?: string[]
  halogen_exposure?: string[]
  has_professional_followup?: boolean
  protocol_risk_level?: ProtocolRiskLevel
  progression_strategy?: ProgressionStrategy
  protocol_alerts?: string[]
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
  'weight_gain',
  'brain_fog',
  'constipation',
  'dry_skin',
  'cold_intolerance',
  'breast_pain',
  'rhinitis',
  'urinary_infection',
  'bad_breath',
  'menstrual_worsening',
  'palpitations',
  'none',
  'other',
])

const SYMPTOM_ALIASES: Record<string, SymptomType> = {
  hair_loss: 'other',
}

function normalizeSymptoms(symptoms: string[] | undefined): SymptomType[] {
  const normalized = (symptoms ?? []).map((symptom) => {
    const aliased = SYMPTOM_ALIASES[symptom] ?? symptom
    return VALID_SYMPTOMS.has(aliased as SymptomType)
      ? aliased as SymptomType
      : 'other'
  })

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
    !payload.sex
  ) {
    return jsonError('Dados do perfil incompletos.')
  }

  const profile: ProfileInsert = {
    ...(() => {
      const protocol = calculateProtocol({
        birthYear: payload.birth_year,
        conditions: payload.conditions ?? [],
        symptoms: payload.current_symptoms ?? [],
        medications: payload.medications ?? [],
        cofactorsInUse: payload.cofactors_in_use ?? [],
        priorIodineExp: payload.prior_iodine_exp ?? false,
        hasProfessional: payload.has_professional_followup ?? false,
        halogenExposure: payload.halogen_exposure ?? [],
        safetyFlags: payload.safety_flags ?? [],
      })

      return {
        phase: protocol.phase,
        recommended_dose_drops: protocol.drops,
        protocol_risk_level: protocol.riskLevel,
        progression_strategy: protocol.progressionStrategy,
        protocol_alerts: protocol.alerts,
        exam_schedule: examScheduleToJson(protocol.examSchedule),
      }
    })(),
    user_id: user.id,
    birth_year: payload.birth_year,
    sex: payload.sex,
    conditions: payload.conditions ?? [],
    medications: payload.medications ?? [],
    prior_iodine_exp: payload.prior_iodine_exp ?? false,
    cofactors_in_use: payload.cofactors_in_use ?? [],
    safety_flags: payload.safety_flags ?? [],
    halogen_exposure: payload.halogen_exposure ?? [],
    has_professional_followup: payload.has_professional_followup ?? false,
    current_symptoms: normalizeSymptoms(payload.current_symptoms),
    main_goal: payload.main_goal ?? null,
    protocol_start_date: payload.protocol_start_date ?? new Date().toISOString().split('T')[0],
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
