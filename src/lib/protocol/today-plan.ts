import type {
  ProgressionStrategy,
  ProtocolPhase,
  ProtocolRiskLevel,
  SemaphoreColor,
  SymptomType,
} from '@/lib/supabase/types'

export type TodayPlanStatus = 'ok' | 'caution' | 'pause' | 'prepare' | 'professional'

export interface TodayPlanChecklistItem {
  label: string
  done: boolean | null
  priority: 'high' | 'normal'
}

export interface TodayPlan {
  status: TodayPlanStatus
  badge: string
  title: string
  primaryAction: string
  reason: string
  tomorrowFocus: string
  checklist: TodayPlanChecklistItem[]
}

export interface TodayPlanLog {
  log_date: string
  semaphore: SemaphoreColor
  energy: number | null
  mood: number | null
  sleep_quality: number | null
  dose_drops: number | null
  symptoms: SymptomType[]
  took_selenium: boolean
  took_magnesium: boolean
  took_vitamins: boolean
  took_vitamin_c: boolean
  drank_water: boolean
  used_salt: boolean
}

export interface TodayPlanInput {
  phase: ProtocolPhase
  riskLevel: ProtocolRiskLevel
  progressionStrategy: ProgressionStrategy
  alerts: string[]
  recommendedDrops: number
  professionalAdjustment?: {
    customDoseSuggestion: number | null
    proNotes: string | null
    professionalName: string | null
  } | null
  todayLog: TodayPlanLog | null
  recentLogs: TodayPlanLog[]
}

function average(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value !== null)
  if (valid.length === 0) return null
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function buildChecklist(todayLog: TodayPlanLog | null): TodayPlanChecklistItem[] {
  return [
    { label: 'Selenio', done: todayLog?.took_selenium ?? null, priority: 'high' },
    { label: 'Magnesio', done: todayLog?.took_magnesium ?? null, priority: 'high' },
    { label: 'Vitamina C', done: todayLog?.took_vitamin_c ?? null, priority: 'normal' },
    { label: 'Vitaminas B/D', done: todayLog?.took_vitamins ?? null, priority: 'normal' },
    { label: 'Agua + sal', done: todayLog ? todayLog.drank_water && todayLog.used_salt : null, priority: 'normal' },
  ]
}

export function buildTodayPlan(input: TodayPlanInput): TodayPlan {
  const recent = input.recentLogs.slice(0, 7)
  const redDays = recent.filter((log) => log.semaphore === 'red').length
  const yellowDays = recent.filter((log) => log.semaphore === 'yellow').length
  const avgEnergy = average(recent.slice(0, 5).map((log) => log.energy))
  const hasPalpitations = recent.some((log) => log.symptoms.includes('palpitations'))
  const checklist = buildChecklist(input.todayLog)

  if (input.riskLevel === 'professional_only') {
    return {
      status: 'professional',
      badge: 'Profissional',
      title: 'Siga somente com acompanhamento',
      primaryAction: 'Nao inicie, suba ou retome dose sem orientacao profissional.',
      reason: input.alerts[0] ?? 'Seu perfil tem sinais que pedem uma conducao mais cuidadosa.',
      tomorrowFocus: 'Anote sintomas, dose tomada e duvidas para levar ao acompanhamento.',
      checklist,
    }
  }

  if (input.todayLog?.semaphore === 'red' || redDays > 0 || hasPalpitations) {
    return {
      status: 'pause',
      badge: 'Pausar',
      title: 'Hoje e dia de reduzir carga',
      primaryAction: 'Pause ou reduza a dose e priorize hidratacao, sal e cofatores.',
      reason: hasPalpitations
        ? 'Palpitacoes entram como sinal de alerta e pedem uma resposta conservadora.'
        : 'Houve semaforo vermelho recentemente, entao o foco agora e estabilizar.',
      tomorrowFocus: 'Observe palpitações, sono, energia e qualquer piora de sintomas.',
      checklist,
    }
  }

  if (input.professionalAdjustment?.customDoseSuggestion !== null && input.professionalAdjustment?.customDoseSuggestion !== undefined) {
    const dose = input.professionalAdjustment.customDoseSuggestion
    return {
      status: 'caution',
      badge: 'Profissional',
      title: 'Siga o ajuste profissional',
      primaryAction: `Use ${dose} gota${dose === 1 ? '' : 's'} conforme orientacao do seu profissional.`,
      reason: input.professionalAdjustment.proNotes
        ?? 'Existe um ajuste ativo enviado pelo profissional que acompanha seu protocolo.',
      tomorrowFocus: 'Observe tolerancia, energia, sono e qualquer sintoma novo apos o ajuste.',
      checklist,
    }
  }

  if (input.phase === '0' || input.progressionStrategy === 'cofactors_first' || input.recommendedDrops === 0) {
    return {
      status: 'prepare',
      badge: 'Preparacao',
      title: 'Fortaleca a base antes do iodo',
      primaryAction: 'Mantenha cofatores, agua e sal; deixe a dose de iodo para a fase indicada.',
      reason: 'Seu protocolo esta em preparacao ou prioriza cofatores antes de progressao.',
      tomorrowFocus: 'Busque completar os cofatores e registrar energia, sono e humor.',
      checklist,
    }
  }

  if (input.riskLevel === 'caution' || input.progressionStrategy === 'slow' || yellowDays >= 2 || (avgEnergy !== null && avgEnergy <= 4)) {
    return {
      status: 'caution',
      badge: 'Atencao',
      title: 'Mantenha a dose atual',
      primaryAction: `Continue com ${input.recommendedDrops} gota${input.recommendedDrops === 1 ? '' : 's'} e fortaleça cofatores.`,
      reason: yellowDays >= 2
        ? 'Apareceram sinais amarelos nos ultimos dias, entao avancar agora seria cedo.'
        : 'Seu perfil pede progressao mais lenta e observacao proxima.',
      tomorrowFocus: 'Observe sono, energia, intestino e tolerancia a dose atual.',
      checklist,
    }
  }

  return {
    status: 'ok',
    badge: 'Continuar',
    title: 'Siga com o plano de hoje',
    primaryAction: `Use ${input.recommendedDrops} gota${input.recommendedDrops === 1 ? '' : 's'} e mantenha os cofatores.`,
    reason: 'Seus sinais recentes nao indicam necessidade de pausar ou reduzir hoje.',
    tomorrowFocus: 'Registre energia, humor, sono e sintomas para ajustar com seguranca.',
    checklist,
  }
}
