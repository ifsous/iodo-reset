// src/app/pro/[patientId]/page.tsx
// Server Component - detalhe inicial do paciente acompanhado pelo profissional

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  buildProPatientClinicalSummary,
  type ProPatientClinicalSummary,
  type ProPatientSignalLog,
} from '@/lib/pro-patient-clinical-summary'
import PatientView from './PatientView'
import type { AlertLevel, PlanType, ProtocolPhase, SemaphoreColor, SymptomType } from '@/lib/supabase/types'

export const metadata = {
  title: 'Paciente - IODO RESET Pro',
}

export interface PatientDetailData {
  professionalId: string
  patient: {
    id: string
    name: string | null
    email: string
    status: string
    alertLevel: AlertLevel
    proNotes: string | null
    customDoseSuggestion: number | null
    phase: ProtocolPhase | null
    protocolStartDate: string | null
    recommendedDoseDrops: number | null
    protocolDay: number | null
    lastLogDate: string | null
    lastSemaphore: SemaphoreColor | null
    lastEnergy: number | null
    lastMood: number | null
    lastDoseDrops: number | null
    guidanceUpdatedAt: string | null
  }
  logs: {
    logDate: string
    semaphore: SemaphoreColor
    energy: number | null
    mood: number | null
    sleepQuality: number | null
    doseDrops: number
    symptoms: SymptomType[]
    tookSelenium: boolean
    tookMagnesium: boolean
    tookVitamins: boolean
    tookVitaminC: boolean
    drankWater: boolean
    usedSalt: boolean
  }[]
  exams: {
    id: string
    label: string
    examDate: string
    resultValue: number | null
    resultUnit: string | null
    isWithinRange: boolean | null
    aiInterpretation: string | null
  }[]
  clinicalSummary: ProPatientClinicalSummary
}

type DashboardRow = {
  professional_id: string
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

type DailyLogRow = {
  log_date: string
  semaphore: SemaphoreColor
  energy: number | null
  mood: number | null
  sleep_quality: number | null
  dose_drops: number
  symptoms: SymptomType[] | null
  took_selenium: boolean | null
  took_magnesium: boolean | null
  took_vitamins: boolean | null
  took_vitamin_c: boolean | null
  drank_water: boolean | null
  used_salt: boolean | null
}

export default async function PatientPage({
  params,
}: {
  params: Promise<{ patientId: string }>
}) {
  const { patientId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('plan, is_professional, onboarding_done')
    .eq('id', user.id)
    .single<{ plan: PlanType; is_professional: boolean; onboarding_done: boolean }>()

  if (!userData?.onboarding_done) redirect('/onboarding')

  const hasProAccess = userData.is_professional || userData.plan === 'pro' || userData.plan === 'clinic'
  if (!hasProAccess) redirect('/dashboard')

  const { data: professional } = await supabase
    .from('professionals')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle<{ id: string }>()

  if (!professional) notFound()

  const { data: patientRow } = await supabase
    .from('v_pro_dashboard')
    .select('professional_id, patient_id, status, alert_level, pro_notes, patient_name, patient_email, protocol_phase, protocol_start_date, recommended_dose_drops, protocol_day, last_log_date, last_semaphore, last_energy, last_mood, last_dose_drops')
    .eq('professional_id', professional.id)
    .eq('patient_id', patientId)
    .maybeSingle<DashboardRow>()

  if (!patientRow) notFound()

  const [{ data: logs }, { data: exams }] = await Promise.all([
    supabase
      .from('daily_logs')
      .select('log_date, semaphore, energy, mood, sleep_quality, dose_drops, symptoms, took_selenium, took_magnesium, took_vitamins, took_vitamin_c, drank_water, used_salt')
      .eq('user_id', patientId)
      .order('log_date', { ascending: false })
      .limit(14)
      .returns<DailyLogRow[]>(),
    supabase
      .from('exams')
      .select('id, exam_type, exam_label, exam_date, result_value, result_unit, is_within_range, ai_interpretation')
      .eq('user_id', patientId)
      .order('exam_date', { ascending: false })
      .limit(8),
  ])

  const { data: proPatient } = await supabase
    .from('pro_patients')
    .select('custom_dose_suggestion, pro_notes, updated_at')
    .eq('professional_id', professional.id)
    .eq('patient_id', patientId)
    .maybeSingle<{ custom_dose_suggestion: number | null; pro_notes: string | null; updated_at: string | null }>()

  const mappedLogs: ProPatientSignalLog[] = (logs ?? []).map((log) => ({
    logDate: log.log_date,
    semaphore: log.semaphore,
    energy: log.energy,
    mood: log.mood,
    sleepQuality: log.sleep_quality,
    doseDrops: log.dose_drops,
    symptoms: log.symptoms ?? [],
    tookSelenium: Boolean(log.took_selenium),
    tookMagnesium: Boolean(log.took_magnesium),
    tookVitamins: Boolean(log.took_vitamins),
    tookVitaminC: Boolean(log.took_vitamin_c),
    drankWater: Boolean(log.drank_water),
    usedSalt: Boolean(log.used_salt),
  }))

  const mappedExams = (exams ?? []).map((exam) => ({
    id: exam.id,
    label: exam.exam_label || exam.exam_type.replace(/_/g, ' ').toUpperCase(),
    examDate: exam.exam_date,
    resultValue: exam.result_value,
    resultUnit: exam.result_unit,
    isWithinRange: exam.is_within_range,
    aiInterpretation: exam.ai_interpretation,
  }))

  const displayName = patientRow.patient_name?.trim() || patientRow.patient_email.split('@')[0] || 'paciente'
  const customDoseSuggestion = proPatient?.custom_dose_suggestion ?? null
  const clinicalSummary = buildProPatientClinicalSummary({
    patientName: displayName,
    alertLevel: patientRow.alert_level,
    customDoseSuggestion,
    recommendedDoseDrops: patientRow.recommended_dose_drops,
    logs: mappedLogs,
    exams: mappedExams,
  })

  const data: PatientDetailData = {
    professionalId: professional.id,
    patient: {
      id: patientRow.patient_id,
      name: patientRow.patient_name,
      email: patientRow.patient_email,
      status: patientRow.status,
      alertLevel: patientRow.alert_level,
      proNotes: proPatient?.pro_notes ?? patientRow.pro_notes,
      customDoseSuggestion,
      phase: patientRow.protocol_phase,
      protocolStartDate: patientRow.protocol_start_date,
      recommendedDoseDrops: patientRow.recommended_dose_drops,
      protocolDay: patientRow.protocol_day,
      lastLogDate: patientRow.last_log_date,
      lastSemaphore: patientRow.last_semaphore,
      lastEnergy: patientRow.last_energy,
      lastMood: patientRow.last_mood,
      lastDoseDrops: patientRow.last_dose_drops,
      guidanceUpdatedAt: proPatient?.updated_at ?? null,
    },
    logs: mappedLogs,
    exams: mappedExams,
    clinicalSummary,
  }

  return <PatientView data={data} />
}
