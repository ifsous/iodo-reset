// src/app/profile/page.tsx
// Server Component - carrega sessao e dados do perfil no servidor

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileView from './ProfileView'
import type {
  Json,
  PlanType,
  ProgressionStrategy,
  ProtocolPhase,
  ProtocolRiskLevel,
  SexType,
  SymptomType,
} from '@/lib/supabase/types'
import type { ProfileData } from './types'

export const metadata = {
  title: 'Perfil - Protocolo IODO RESET',
}

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('email, full_name, plan, is_professional, onboarding_done')
    .eq('id', user.id)
    .single<{
      email: string
      full_name: string | null
      plan: PlanType
      is_professional: boolean
      onboarding_done: boolean
    }>()

  if (!userData?.onboarding_done) redirect('/onboarding')

  const { data: profile } = await supabase
    .from('profiles')
    .select('birth_year, sex, weight_kg, conditions, medications, current_symptoms, main_goal, prior_iodine_exp, cofactors_in_use, safety_flags, halogen_exposure, has_professional_followup, protocol_risk_level, progression_strategy, protocol_alerts, exam_schedule, phase, protocol_start_date, recommended_dose_drops, pro_notes')
    .eq('user_id', user.id)
    .single<{
      birth_year: number | null
      sex: SexType | null
      weight_kg: number | null
      conditions: string[]
      medications: string[]
      current_symptoms: SymptomType[]
      main_goal: string | null
      prior_iodine_exp: boolean
      cofactors_in_use: string[]
      safety_flags: string[]
      halogen_exposure: string[]
      has_professional_followup: boolean
      protocol_risk_level: ProtocolRiskLevel
      progression_strategy: ProgressionStrategy
      protocol_alerts: string[]
      exam_schedule: Json
      phase: ProtocolPhase
      protocol_start_date: string | null
      recommended_dose_drops: number
      pro_notes: string | null
    }>()

  if (!profile) redirect('/onboarding')

  const data: ProfileData = {
    user: {
      id: user.id,
      email: userData.email || user.email || '',
      fullName: userData.full_name,
      plan: userData.plan,
      isProfessional: userData.is_professional,
    },
    profile: {
      birthYear: profile.birth_year,
      sex: profile.sex,
      weightKg: profile.weight_kg,
      conditions: profile.conditions ?? [],
      medications: profile.medications ?? [],
      currentSymptoms: profile.current_symptoms ?? [],
      mainGoal: profile.main_goal,
      priorIodineExp: profile.prior_iodine_exp,
      cofactorsInUse: profile.cofactors_in_use ?? [],
      safetyFlags: profile.safety_flags ?? [],
      halogenExposure: profile.halogen_exposure ?? [],
      hasProfessionalFollowup: profile.has_professional_followup ?? false,
      protocolRiskLevel: profile.protocol_risk_level ?? 'standard',
      progressionStrategy: profile.progression_strategy ?? 'standard',
      protocolAlerts: profile.protocol_alerts ?? [],
      examSchedule: profile.exam_schedule ?? [],
      phase: profile.phase,
      protocolStartDate: profile.protocol_start_date,
      recommendedDoseDrops: profile.recommended_dose_drops,
      proNotes: profile.pro_notes,
    },
  }

  return <ProfileView data={data} />
}
