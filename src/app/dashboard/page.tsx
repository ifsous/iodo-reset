// src/app/dashboard/page.tsx
// Server Component — lê dados no servidor e passa como props
// Sem 'use client' — renderiza no servidor, zero JS para auth check

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAiLimitPolicy, getCurrentMonthStart, type AiLimitWindow } from '@/lib/ai-limits'
import { buildPatientInsights, type PatientInsightLog, type PatientInsights } from '@/lib/protocol/patient-insights'
import { buildPatientRetention, type PatientRetention, type PatientRetentionLog } from '@/lib/protocol/patient-retention'
import { buildProgressHistory, type ProgressHistory, type ProgressHistoryLog } from '@/lib/protocol/progress-history'
import { buildProgressionReadiness, type ProgressionReadiness, type ProgressionLog } from '@/lib/protocol/progression-readiness'
import { buildProtocolIntelligence, type ProtocolIntelligence } from '@/lib/protocol/protocol-intelligence'
import { buildTodayPlan, type TodayPlan, type TodayPlanLog } from '@/lib/protocol/today-plan'
import DashboardView    from './DashboardView'
import type { Json, PlanType, ProgressionStrategy, ProtocolPhase, ProtocolRiskLevel, SemaphoreColor, SymptomType } from '@/lib/supabase/types'

export const metadata = {
  title: 'Dashboard — Protocolo IODO RESET',
}

export interface DashboardData {
  userName:           string
  phase:              ProtocolPhase
  drops:              number
  protocolStartDate:  string | null
  conditions:         string[]
  protocolRiskLevel:  ProtocolRiskLevel
  progressionStrategy: ProgressionStrategy
  protocolAlerts:     string[]
  examSchedule:       Json
  plan:               PlanType
  isProfessional:     boolean
  analysesUsed:       number
  analysesLimit:      number | null
  analysesWindow:     AiLimitWindow
  todayPlan:          TodayPlan
  progressionReadiness: ProgressionReadiness
  progressHistory:    ProgressHistory
  patientInsights:    PatientInsights
  patientRetention:   PatientRetention
  protocolIntelligence: ProtocolIntelligence
  notifications: {
    id: string
    type: 'pro_invite' | 'protocol_update' | 'message' | 'system'
    title: string
    body: string
    actionUrl: string | null
    status: 'unread' | 'read' | 'archived'
    createdAt: string
  }[]
  professionalAdjustment: {
    customDoseSuggestion: number | null
    proNotes: string | null
    professionalName: string | null
    updatedAt: string | null
    latestGuidance: {
      id: string
      message: string
      status: 'sent' | 'read' | 'question' | 'responded'
      patientFeedback: string | null
      sentAt: string
      acknowledgedAt: string | null
      respondedAt: string | null
    } | null
  } | null
  lastLog: DashboardLastLog | null
  recentLogs: DashboardRecentLog[]
}

type DashboardUserData = {
  full_name: string | null
  onboarding_done: boolean
  plan: PlanType
  is_professional: boolean
}

type DashboardProfile = {
  phase: ProtocolPhase
  recommended_dose_drops: number
  protocol_start_date: string | null
  conditions: string[]
  medications: string[]
  current_symptoms: SymptomType[]
  cofactors_in_use: string[]
  safety_flags: string[]
  halogen_exposure: string[]
  protocol_risk_level: ProtocolRiskLevel
  progression_strategy: ProgressionStrategy
  protocol_alerts: string[]
  exam_schedule: Json
}

type DashboardLastLog = {
  id: string
  semaphore: SemaphoreColor
  energy: number | null
  mood: number | null
  sleep_quality: number | null
  dose_drops: number | null
  log_date: string
  symptoms: SymptomType[]
  took_selenium: boolean
  took_magnesium: boolean
  took_vitamins: boolean
  took_vitamin_c: boolean
  drank_water: boolean
  used_salt: boolean
}

type DashboardRecentLog = {
  log_date: string
  energy: number | null
  mood: number | null
  sleep_quality: number | null
  semaphore: SemaphoreColor
  dose_drops: number
  symptoms: SymptomType[]
  took_selenium: boolean
  took_magnesium: boolean
  took_vitamins: boolean
  took_vitamin_c: boolean
  drank_water: boolean
  used_salt: boolean
}

type ProfessionalLink = {
  professional_id: string
  custom_dose_suggestion: number | null
  pro_notes: string | null
  updated_at: string | null
}

type LatestGuidanceRow = {
  id: string
  message: string
  status: 'sent' | 'read' | 'question' | 'responded'
  patient_feedback: string | null
  sent_at: string
  acknowledged_at: string | null
  responded_at: string | null
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Verificação de sessão no servidor
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Busca dados do usuário
  const { data: rawUserData } = await supabase
    .from('users')
    .select('full_name, onboarding_done, plan, is_professional')
    .eq('id', user.id)
    .single()
  const userData = rawUserData as DashboardUserData | null

  if (!userData?.onboarding_done) redirect('/onboarding')

  // Busca perfil clínico
  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('phase, recommended_dose_drops, protocol_start_date, conditions, medications, current_symptoms, cofactors_in_use, safety_flags, halogen_exposure, protocol_risk_level, progression_strategy, protocol_alerts, exam_schedule')
    .eq('user_id', user.id)
    .single()
  const profile = rawProfile as DashboardProfile | null

  if (!profile) redirect('/onboarding')

  // Busca último registro diário
  const { data: rawLastLog } = await supabase
    .from('daily_logs')
    .select('id, semaphore, energy, mood, sleep_quality, dose_drops, log_date, symptoms, took_selenium, took_magnesium, took_vitamins, took_vitamin_c, drank_water, used_salt')
    .eq('user_id', user.id)
    .order('log_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  const lastLog = rawLastLog as DashboardLastLog | null

  // Busca últimos 7 logs para o gráfico
  const { data: recentLogs } = await supabase
    .from('daily_logs')
    .select('log_date, energy, mood, sleep_quality, semaphore, dose_drops, symptoms, took_selenium, took_magnesium, took_vitamins, took_vitamin_c, drank_water, used_salt')
    .eq('user_id', user.id)
    .order('log_date', { ascending: false })
    .limit(7)

  // Busca histórico maior para padrões de progresso
  const { data: progressLogs } = await supabase
    .from('daily_logs')
    .select('log_date, energy, mood, sleep_quality, semaphore, symptoms, took_selenium, took_magnesium, took_vitamins, took_vitamin_c, drank_water, used_salt')
    .eq('user_id', user.id)
    .order('log_date', { ascending: false })
    .limit(30)

  const { data: rawProfessionalLink } = await supabase
    .from('pro_patients')
    .select('professional_id, custom_dose_suggestion, pro_notes, updated_at')
    .eq('patient_id', user.id)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const professionalLink = rawProfessionalLink as ProfessionalLink | null

  const { data: rawProfessionalAdjustmentSource } = professionalLink
    ? await supabase
        .from('professionals')
        .select('display_name')
        .eq('id', professionalLink.professional_id)
        .maybeSingle()
    : { data: null }
  const professionalAdjustmentSource = rawProfessionalAdjustmentSource as { display_name: string | null } | null

  const hasProfessionalGuidance = Boolean(
    professionalLink?.pro_notes?.trim() ||
    (professionalLink?.custom_dose_suggestion !== null && professionalLink?.custom_dose_suggestion !== undefined)
  )

  const { data: rawLatestGuidanceRow } = professionalLink
    ? await supabase
        .from('pro_guidance_history')
        .select('id, message, status, patient_feedback, sent_at, acknowledged_at, responded_at')
        .eq('patient_id', user.id)
        .eq('professional_id', professionalLink.professional_id)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }
  const latestGuidanceRow = rawLatestGuidanceRow as LatestGuidanceRow | null

  const professionalAdjustment = professionalLink && hasProfessionalGuidance
    ? {
        customDoseSuggestion: professionalLink.custom_dose_suggestion,
        proNotes: professionalLink.pro_notes,
        professionalName: professionalAdjustmentSource?.display_name ?? null,
        updatedAt: professionalLink.updated_at,
        latestGuidance: latestGuidanceRow
          ? {
              id: latestGuidanceRow.id,
              message: latestGuidanceRow.message,
              status: latestGuidanceRow.status,
              patientFeedback: latestGuidanceRow.patient_feedback,
              sentAt: latestGuidanceRow.sent_at,
              acknowledgedAt: latestGuidanceRow.acknowledged_at,
              respondedAt: latestGuidanceRow.responded_at,
            }
          : null,
      }
    : null

  const { data: notificationRows } = await supabase
    .from('notifications')
    .select('id, type, title, body, action_url, status, created_at')
    .eq('user_id', user.id)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(8)
    .returns<{
      id: string
      type: 'pro_invite' | 'protocol_update' | 'message' | 'system'
      title: string
      body: string
      action_url: string | null
      status: 'unread' | 'read' | 'archived'
      created_at: string
    }[]>()

  const analysisPolicy = getAiLimitPolicy(userData.plan)
  const diaryAnalysesQuery = supabase
    .from('ai_analyses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
  const examAnalysesQuery = supabase
    .from('exams')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .not('ai_interpreted_at', 'is', null)

  if (analysisPolicy.window === 'monthly') {
    const monthStart = getCurrentMonthStart()
    diaryAnalysesQuery.gte('created_at', monthStart)
    examAnalysesQuery.gte('ai_interpreted_at', monthStart)
  }

  const [{ count: diaryAnalysesUsed }, { count: examAnalysesUsed }] = analysisPolicy.window === 'unlimited'
    ? [{ count: 0 }, { count: 0 }]
    : await Promise.all([diaryAnalysesQuery, examAnalysesQuery])

  const todayDate = new Date().toISOString().split('T')[0]
  const typedRecentLogs = (recentLogs ?? []) as DashboardRecentLog[]
  const recentLogSignals = typedRecentLogs as TodayPlanLog[]
  const progressionLogSignals = typedRecentLogs as ProgressionLog[]
  const progressHistoryLogs = (progressLogs ?? []) as ProgressHistoryLog[]
  const patientInsightLogs = (progressLogs ?? []) as PatientInsightLog[]
  const patientRetentionLogs = (progressLogs ?? []) as PatientRetentionLog[]
  const nextExam = Array.isArray(profile.exam_schedule)
    ? profile.exam_schedule.find((item): item is { label?: string; timing?: string } =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
      ) ?? null
    : null
  const todayPlan = buildTodayPlan({
    phase: profile.phase,
    riskLevel: profile.protocol_risk_level ?? 'standard',
    progressionStrategy: profile.progression_strategy ?? 'standard',
    alerts: profile.protocol_alerts ?? [],
    recommendedDrops: profile.recommended_dose_drops,
    professionalAdjustment,
    todayLog: lastLog?.log_date === todayDate ? lastLog : null,
    recentLogs: recentLogSignals,
  })
  const progressionReadiness = buildProgressionReadiness({
    phase: profile.phase,
    riskLevel: profile.protocol_risk_level ?? 'standard',
    progressionStrategy: profile.progression_strategy ?? 'standard',
    protocolStartDate: profile.protocol_start_date,
    recentLogs: progressionLogSignals,
  })
  const progressHistory = buildProgressHistory(progressHistoryLogs)
  const patientInsights = buildPatientInsights({
    phase: profile.phase,
    riskLevel: profile.protocol_risk_level ?? 'standard',
    progressionStrategy: profile.progression_strategy ?? 'standard',
    recommendedDrops: profile.recommended_dose_drops,
    protocolStartDate: profile.protocol_start_date,
    professionalAdjustment,
    recentLogs: patientInsightLogs,
  })
  const patientRetention = buildPatientRetention({
    phase: profile.phase,
    riskLevel: profile.protocol_risk_level ?? 'standard',
    protocolStartDate: profile.protocol_start_date,
    professionalAdjustment,
    todayLog: lastLog?.log_date === todayDate ? lastLog : null,
    recentLogs: patientRetentionLogs,
    nextExam,
  })
  const recentSignalWindow = recentLogSignals.slice(0, 7)
  const protocolIntelligence = buildProtocolIntelligence({
    phase: profile.phase,
    riskLevel: profile.protocol_risk_level ?? 'standard',
    progressionStrategy: profile.progression_strategy ?? 'standard',
    recommendedDrops: profile.recommended_dose_drops,
    conditions: profile.conditions ?? [],
    symptoms: profile.current_symptoms ?? [],
    medications: profile.medications ?? [],
    cofactorsInUse: profile.cofactors_in_use ?? [],
    safetyFlags: profile.safety_flags ?? [],
    halogenExposure: profile.halogen_exposure ?? [],
    protocolAlerts: profile.protocol_alerts ?? [],
    recentSignals: {
      redDays: recentSignalWindow.filter((log) => log.semaphore === 'red').length,
      yellowDays: recentSignalWindow.filter((log) => log.semaphore === 'yellow').length,
      hasPalpitations: recentSignalWindow.some((log) => log.symptoms.includes('palpitations')),
      cofactorReadyDays: recentSignalWindow.filter((log) =>
        [log.took_selenium, log.took_magnesium, log.took_vitamins, log.took_vitamin_c, log.drank_water && log.used_salt]
          .filter(Boolean).length >= 4
      ).length,
      loggedDays: recentSignalWindow.length,
    },
  })

  const dashboardData: DashboardData = {
    userName:          userData?.full_name?.split(' ')[0] ?? 'Usuário',
    phase:             profile.phase,
    drops:             profile.recommended_dose_drops,
    protocolStartDate: profile.protocol_start_date,
    conditions:        profile.conditions ?? [],
    protocolRiskLevel: profile.protocol_risk_level ?? 'standard',
    progressionStrategy: profile.progression_strategy ?? 'standard',
    protocolAlerts:    profile.protocol_alerts ?? [],
    examSchedule:      profile.exam_schedule ?? [],
    plan:              userData.plan,
    isProfessional:    userData.is_professional,
    analysesUsed:      (diaryAnalysesUsed ?? 0) + (examAnalysesUsed ?? 0),
    analysesLimit:     analysisPolicy.limit,
    analysesWindow:    analysisPolicy.window,
    todayPlan,
    progressionReadiness,
    progressHistory,
    patientInsights,
    patientRetention,
    protocolIntelligence,
    notifications: (notificationRows ?? []).map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      actionUrl: notification.action_url,
      status: notification.status,
      createdAt: notification.created_at,
    })),
    professionalAdjustment,
    lastLog:           lastLog ?? null,
    recentLogs:        typedRecentLogs.reverse(),
  }

  return <DashboardView data={dashboardData} />
}
