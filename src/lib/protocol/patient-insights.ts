import type { ProgressionStrategy, ProtocolPhase, ProtocolRiskLevel, SemaphoreColor, SymptomType } from '@/lib/supabase/types'

export type WeeklyGoalStatus = 'done' | 'active' | 'blocked'
export type TimelineStepStatus = 'done' | 'current' | 'next' | 'locked'

export interface WeeklyGoal {
  label: string
  value: string
  target: string
  progressPercent: number
  status: WeeklyGoalStatus
  detail: string
}

export interface TimelineStep {
  phase: ProtocolPhase
  label: string
  status: TimelineStepStatus
  detail: string
}

export interface DoseExplanation {
  title: string
  summary: string
  reasons: string[]
}

export interface PatientInsights {
  weeklyGoals: WeeklyGoal[]
  timeline: TimelineStep[]
  doseExplanation: DoseExplanation
}

export interface PatientInsightLog {
  log_date: string
  semaphore: SemaphoreColor
  energy: number | null
  mood: number | null
  sleep_quality: number | null
  dose_drops: number
  symptoms: SymptomType[]
  took_selenium: boolean
  took_magnesium: boolean
  took_vitamins: boolean
  took_vitamin_c: boolean
  drank_water: boolean
  used_salt: boolean
}

export interface PatientInsightsInput {
  phase: ProtocolPhase
  riskLevel: ProtocolRiskLevel
  progressionStrategy: ProgressionStrategy
  recommendedDrops: number
  protocolStartDate: string | null
  professionalAdjustment?: {
    customDoseSuggestion: number | null
    proNotes: string | null
    professionalName: string | null
  } | null
  recentLogs: PatientInsightLog[]
}

const PHASES: Array<{ phase: ProtocolPhase; label: string; detail: string }> = [
  { phase: '0', label: 'Base', detail: 'Cofatores, agua, sal e registro consistente.' },
  { phase: '1', label: 'Ativacao', detail: 'Dose baixa e observacao de tolerancia.' },
  { phase: '2', label: 'Progressao', detail: 'Avanco gradual quando os sinais permitem.' },
  { phase: '3', label: 'Detox', detail: 'Acompanhamento proximo de sintomas e cofatores.' },
  { phase: '4', label: 'Estabilizacao', detail: 'Manter ganhos e revisar exames.' },
]

function cofactorScore(log: PatientInsightLog): number {
  const checks = [
    log.took_selenium,
    log.took_magnesium,
    log.took_vitamins,
    log.took_vitamin_c,
    log.drank_water,
    log.used_salt,
  ]
  return checks.filter(Boolean).length / checks.length
}

function goalStatus(progressPercent: number, blocked: boolean): WeeklyGoalStatus {
  if (blocked) return 'blocked'
  if (progressPercent >= 100) return 'done'
  return 'active'
}

function buildWeeklyGoals(logs: PatientInsightLog[]): WeeklyGoal[] {
  const week = logs.slice(0, 7)
  const loggedDays = week.length
  const cofactorDays = week.filter((log) => cofactorScore(log) >= 0.8).length
  const stableDays = week.filter((log) => log.semaphore !== 'red' && !log.symptoms.includes('palpitations')).length
  const redDays = week.filter((log) => log.semaphore === 'red' || log.symptoms.includes('palpitations')).length

  const logProgress = Math.min(100, Math.round((loggedDays / 5) * 100))
  const cofactorProgress = Math.min(100, Math.round((cofactorDays / 5) * 100))
  const stableProgress = Math.min(100, Math.round((stableDays / 5) * 100))

  return [
    {
      label: 'Registrar 5 dias',
      value: `${loggedDays}/5`,
      target: '5 dias',
      progressPercent: logProgress,
      status: goalStatus(logProgress, false),
      detail: 'Base para o app entender seu padrao real.',
    },
    {
      label: 'Cofatores quase completos',
      value: `${cofactorDays}/5`,
      target: '5 dias',
      progressPercent: cofactorProgress,
      status: goalStatus(cofactorProgress, false),
      detail: 'Foco em selenio, magnesio, vitaminas, agua e sal.',
    },
    {
      label: 'Estabilidade clinica',
      value: redDays > 0 ? `${redDays} alerta` : `${stableDays}/5`,
      target: 'sem vermelho',
      progressPercent: stableProgress,
      status: goalStatus(stableProgress, redDays > 0),
      detail: redDays > 0 ? 'Resolva sinais vermelhos antes de avancar.' : 'Dias sem vermelho ou palpitacao.',
    },
  ]
}

function buildTimeline(phase: ProtocolPhase, riskLevel: ProtocolRiskLevel): TimelineStep[] {
  const currentIndex = PHASES.findIndex((step) => step.phase === phase)

  return PHASES.map((step, index) => {
    let status: TimelineStepStatus = 'locked'
    if (index < currentIndex) status = 'done'
    if (index === currentIndex) status = 'current'
    if (index === currentIndex + 1) status = riskLevel === 'professional_only' ? 'locked' : 'next'

    return {
      phase: step.phase,
      label: step.label,
      status,
      detail: step.detail,
    }
  })
}

function buildDoseExplanation(input: PatientInsightsInput): DoseExplanation {
  const reasons: string[] = []

  if (input.professionalAdjustment?.customDoseSuggestion !== null && input.professionalAdjustment?.customDoseSuggestion !== undefined) {
    reasons.push('Existe um ajuste ativo enviado pelo profissional que acompanha voce.')
  }

  if (input.riskLevel === 'professional_only') {
    reasons.push('Seu perfil tem criterios que pedem acompanhamento profissional antes de iniciar ou subir dose.')
  }

  if (input.phase === '0' || input.recommendedDrops === 0 || input.progressionStrategy === 'cofactors_first') {
    reasons.push('A fase atual prioriza base nutricional e tolerancia antes do iodo.')
  }

  if (input.progressionStrategy === 'slow') {
    reasons.push('Sua estrategia de progressao e lenta para reduzir risco de piora de sintomas.')
  }

  const recentRed = input.recentLogs.slice(0, 7).some((log) => log.semaphore === 'red' || log.symptoms.includes('palpitations'))
  if (recentRed) {
    reasons.push('Houve sinal de alerta recente; estabilidade vem antes de aumentar dose.')
  }

  if (reasons.length === 0) {
    reasons.push('A dose acompanha sua fase atual e os sinais recentes registrados no diario.')
  }

  const dose = input.professionalAdjustment?.customDoseSuggestion ?? input.recommendedDrops
  const title = dose === 0 ? 'Por que ainda sem iodo?' : `Por que ${dose} gota${dose === 1 ? '' : 's'} agora?`

  return {
    title,
    summary: dose === 0
      ? 'Neste momento o app esta protegendo a preparacao antes de sugerir iodo.'
      : 'A dose atual tenta equilibrar progresso com tolerancia e seguranca.',
    reasons,
  }
}

export function buildPatientInsights(input: PatientInsightsInput): PatientInsights {
  return {
    weeklyGoals: buildWeeklyGoals(input.recentLogs),
    timeline: buildTimeline(input.phase, input.riskLevel),
    doseExplanation: buildDoseExplanation(input),
  }
}
