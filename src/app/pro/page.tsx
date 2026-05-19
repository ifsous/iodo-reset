// src/app/pro/page.tsx
// Server Component - painel profissional com dados agregados dos pacientes

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildProTriage, type ProTriage } from '@/lib/pro-triage'
import ProView from './ProView'
import type { AlertLevel, PlanType, ProtocolPhase, SemaphoreColor } from '@/lib/supabase/types'

export const metadata = {
  title: 'Painel Pro - IODO RESET',
}

export interface ProPatientSummary {
  patientId: string
  status: string
  alertLevel: AlertLevel
  proNotes: string | null
  patientName: string | null
  patientEmail: string
  protocolPhase: ProtocolPhase | null
  protocolStartDate: string | null
  recommendedDoseDrops: number | null
  protocolDay: number | null
  lastLogDate: string | null
  lastSemaphore: SemaphoreColor | null
  lastEnergy: number | null
  lastMood: number | null
  lastDoseDrops: number | null
  triage: ProTriage
}

export interface ProData {
  user: {
    id: string
    email: string
    fullName: string | null
    plan: PlanType
    isProfessional: boolean
  }
  professional: {
    id: string
    displayName: string
    credential: string | null
    specialty: string | null
    bio: string | null
    patientLimit: number
    alertOnRed: boolean
    alertOnYellow: boolean
    alertEmail: string | null
    isVerified: boolean
  } | null
  patients: ProPatientSummary[]
}

type ProfessionalRow = {
  id: string
  display_name: string
  credential: string | null
  specialty: string | null
  bio: string | null
  patient_limit: number
  alert_on_red: boolean
  alert_on_yellow: boolean
  alert_email: string | null
  is_verified: boolean
}

async function ensureProfessionalProfile(user: {
  id: string
  email: string
  full_name: string | null
}): Promise<ProfessionalRow | null> {
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('professionals')
    .select('id, display_name, credential, specialty, bio, patient_limit, alert_on_red, alert_on_yellow, alert_email, is_verified')
    .eq('user_id', user.id)
    .maybeSingle<ProfessionalRow>()

  if (existing) return existing

  const { data } = await admin
    .from('professionals')
    .insert({
      user_id: user.id,
      display_name: user.full_name?.trim() || user.email.split('@')[0] || 'Profissional',
    })
    .select('id, display_name, credential, specialty, bio, patient_limit, alert_on_red, alert_on_yellow, alert_email, is_verified')
    .single<ProfessionalRow>()

  return data ?? null
}

type DashboardRow = {
  patient_id: string
  status: string
  alert_level: AlertLevel
  pro_notes: string | null
  patient_name: string | null
  patient_email: string
  protocol_phase: ProtocolPhase | null
  protocol_start_date: string | null
  recommended_dose_drops: number | null
  protocol_day: number | null
  last_log_date: string | null
  last_semaphore: SemaphoreColor | null
  last_energy: number | null
  last_mood: number | null
  last_dose_drops: number | null
}

function sortPatients(a: ProPatientSummary, b: ProPatientSummary) {
  const scoreDiff = b.triage.score - a.triage.score
  if (scoreDiff !== 0) return scoreDiff

  const aDate = a.lastLogDate ?? ''
  const bDate = b.lastLogDate ?? ''
  return bDate.localeCompare(aDate)
}

export default async function ProPage() {
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

  const hasProAccess = userData.is_professional || userData.plan === 'pro' || userData.plan === 'clinic'
  if (!hasProAccess) redirect('/dashboard')

  const { data: existingProfessional } = await supabase
    .from('professionals')
    .select('id, display_name, credential, specialty, bio, patient_limit, alert_on_red, alert_on_yellow, alert_email, is_verified')
    .eq('user_id', user.id)
    .maybeSingle<ProfessionalRow>()

  const professional = existingProfessional ?? (
    userData.is_professional || userData.plan === 'clinic'
      ? await ensureProfessionalProfile({
          id: user.id,
          email: userData.email || user.email || '',
          full_name: userData.full_name,
        })
      : null
  )

  let patients: ProPatientSummary[] = []

  if (professional) {
    const { data: rows } = await supabase
      .from('v_pro_dashboard')
      .select('patient_id, status, alert_level, pro_notes, patient_name, patient_email, protocol_phase, protocol_start_date, recommended_dose_drops, protocol_day, last_log_date, last_semaphore, last_energy, last_mood, last_dose_drops')
      .eq('professional_id', professional.id)

    patients = ((rows ?? []) as DashboardRow[])
      .map((row) => {
        const triage = buildProTriage({
          status: row.status,
          alertLevel: row.alert_level,
          lastLogDate: row.last_log_date,
          lastSemaphore: row.last_semaphore,
          lastEnergy: row.last_energy,
          lastMood: row.last_mood,
          proNotes: row.pro_notes,
        })

        return {
          patientId: row.patient_id,
          status: row.status,
          alertLevel: row.alert_level,
          proNotes: row.pro_notes,
          patientName: row.patient_name,
          patientEmail: row.patient_email,
          protocolPhase: row.protocol_phase,
          protocolStartDate: row.protocol_start_date,
          recommendedDoseDrops: row.recommended_dose_drops,
          protocolDay: row.protocol_day,
          lastLogDate: row.last_log_date,
          lastSemaphore: row.last_semaphore,
          lastEnergy: row.last_energy,
          lastMood: row.last_mood,
          lastDoseDrops: row.last_dose_drops,
          triage,
        }
      })
      .sort(sortPatients)
  }

  const data: ProData = {
    user: {
      id: user.id,
      email: userData.email || user.email || '',
      fullName: userData.full_name,
      plan: userData.plan,
      isProfessional: userData.is_professional,
    },
    professional: professional
      ? {
          id: professional.id,
          displayName: professional.display_name,
          credential: professional.credential,
          specialty: professional.specialty,
          bio: professional.bio,
          patientLimit: professional.patient_limit,
          alertOnRed: professional.alert_on_red,
          alertOnYellow: professional.alert_on_yellow,
          alertEmail: professional.alert_email,
          isVerified: professional.is_verified,
        }
      : null,
    patients,
  }

  return <ProView data={data} />
}
