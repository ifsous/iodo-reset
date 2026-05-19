import type { ProtocolPhase, ProtocolRiskLevel, SemaphoreColor, SymptomType } from '@/lib/supabase/types'

export type RetentionActionTarget = 'diary' | 'exams' | 'protocol' | 'profile'
export type RetentionTone = 'good' | 'watch' | 'alert' | 'neutral'

export interface PatientRetentionAction {
  label: string
  detail: string
  target: RetentionActionTarget
  priority: 'primary' | 'secondary'
}

export interface PatientReminder {
  label: string
  detail: string
  dueLabel: string
  tone: RetentionTone
  target: RetentionActionTarget
}

export interface PatientCheckIn {
  title: string
  summary: string
  streakDays: number
  missedDays: number
  tone: RetentionTone
  primaryAction: PatientRetentionAction
}

export interface PatientRetention {
  checkIn: PatientCheckIn
  nextActions: PatientRetentionAction[]
  reminders: PatientReminder[]
}

export interface PatientRetentionLog {
  log_date: string
  semaphore: SemaphoreColor
  symptoms: SymptomType[]
  took_selenium: boolean
  took_magnesium: boolean
  took_vitamins: boolean
  took_vitamin_c: boolean
  drank_water: boolean
  used_salt: boolean
}

export interface PatientRetentionInput {
  phase: ProtocolPhase
  riskLevel: ProtocolRiskLevel
  protocolStartDate: string | null
  todayLog: PatientRetentionLog | null
  recentLogs: PatientRetentionLog[]
  nextExam?: {
    label?: string
    timing?: string
  } | null
  professionalAdjustment?: {
    customDoseSuggestion: number | null
    proNotes: string | null
    professionalName: string | null
  } | null
}

function dateKey(date = new Date()): string {
  return date.toISOString().split('T')[0]
}

function daysBetween(from: string, to = dateKey()): number {
  const fromTime = new Date(`${from}T12:00:00`).getTime()
  const toTime = new Date(`${to}T12:00:00`).getTime()
  return Math.max(0, Math.round((toTime - fromTime) / (1000 * 60 * 60 * 24)))
}

function cofactorScore(log: PatientRetentionLog | null): number {
  if (!log) return 0
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

function currentStreak(logs: PatientRetentionLog[]): number {
  const loggedDays = new Set(logs.map((log) => log.log_date))
  let streak = 0
  const cursor = new Date(`${dateKey()}T12:00:00`)

  while (loggedDays.has(cursor.toISOString().split('T')[0])) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

function buildCheckIn(input: PatientRetentionInput): PatientCheckIn {
  const lastLog = input.recentLogs[0] ?? null
  const missedDays = lastLog ? daysBetween(lastLog.log_date) : 999
  const streakDays = currentStreak(input.recentLogs)
  const hasToday = Boolean(input.todayLog)

  if (!hasToday && missedDays >= 3) {
    return {
      title: 'Retome com um check-in simples',
      summary: 'Voce ficou alguns dias sem registrar. Um registro rapido ja recoloca o app no seu contexto real.',
      streakDays,
      missedDays,
      tone: 'watch',
      primaryAction: {
        label: 'Registrar agora',
        detail: 'Energia, sono, humor, dose e cofatores.',
        target: 'diary',
        priority: 'primary',
      },
    }
  }

  if (!hasToday) {
    return {
      title: 'Seu check-in de hoje esta aberto',
      summary: 'Registrar hoje ajuda o app a diferenciar progresso real de oscilacao normal.',
      streakDays,
      missedDays,
      tone: 'neutral',
      primaryAction: {
        label: 'Fazer check-in',
        detail: 'Leva menos de um minuto.',
        target: 'diary',
        priority: 'primary',
      },
    }
  }

  if (input.todayLog?.semaphore === 'red' || input.todayLog?.symptoms.includes('palpitations')) {
    return {
      title: 'Check-in recebido: priorize estabilidade',
      summary: 'O registro de hoje tem sinal de alerta. O mais importante agora e observar e reduzir carga.',
      streakDays,
      missedDays: 0,
      tone: 'alert',
      primaryAction: {
        label: 'Revisar protocolo',
        detail: 'Veja como agir em sinal vermelho.',
        target: 'protocol',
        priority: 'primary',
      },
    }
  }

  return {
    title: streakDays >= 3 ? `Sequencia de ${streakDays} dias` : 'Check-in de hoje concluido',
    summary: streakDays >= 3
      ? 'Boa consistencia. Agora o app consegue ler melhor seus padroes da semana.'
      : 'Registro salvo. Continue observando energia, sono e sintomas antes de qualquer mudanca.',
    streakDays,
    missedDays: 0,
    tone: 'good',
    primaryAction: {
      label: 'Ver proximos passos',
      detail: 'Revise metas, exames e fase atual.',
      target: 'protocol',
      priority: 'primary',
    },
  }
}

function buildNextActions(input: PatientRetentionInput): PatientRetentionAction[] {
  const actions: PatientRetentionAction[] = []
  const hasToday = Boolean(input.todayLog)
  const cofactorPct = cofactorScore(input.todayLog)
  const recentRed = input.recentLogs.slice(0, 7).some((log) => log.semaphore === 'red' || log.symptoms.includes('palpitations'))

  if (!hasToday) {
    actions.push({
      label: 'Registrar diario de hoje',
      detail: 'Sem esse check-in, o app trabalha com sinais antigos.',
      target: 'diary',
      priority: 'primary',
    })
  }

  if (hasToday && cofactorPct < 0.8) {
    actions.push({
      label: 'Completar cofatores',
      detail: 'Selenio, magnesio, vitaminas, agua e sal sustentam tolerancia.',
      target: 'diary',
      priority: 'primary',
    })
  }

  if (recentRed || input.riskLevel === 'professional_only') {
    actions.push({
      label: 'Revisar seguranca',
      detail: 'Confira sinais que pedem pausa, reducao ou acompanhamento.',
      target: 'protocol',
      priority: actions.length === 0 ? 'primary' : 'secondary',
    })
  }

  if (input.nextExam) {
    actions.push({
      label: 'Planejar proximo exame',
      detail: input.nextExam.label ?? 'Use exames para validar a evolucao.',
      target: 'exams',
      priority: actions.length === 0 ? 'primary' : 'secondary',
    })
  }

  if (actions.length === 0) {
    actions.push({
      label: 'Manter rotina de hoje',
      detail: 'Continue registrando e revise a linha do tempo antes de avancar.',
      target: 'protocol',
      priority: 'primary',
    })
  }

  return actions.slice(0, 3)
}

function buildReminders(input: PatientRetentionInput): PatientReminder[] {
  const reminders: PatientReminder[] = []
  const hasToday = Boolean(input.todayLog)

  if (!hasToday) {
    reminders.push({
      label: 'Check-in diario',
      detail: 'Registre antes do fim do dia para manter a leitura do app atualizada.',
      dueLabel: 'Hoje',
      tone: 'watch',
      target: 'diary',
    })
  }

  if (input.phase === '0') {
    reminders.push({
      label: 'Base antes do iodo',
      detail: 'Fase de preparacao: cofatores e observacao vem antes de subir dose.',
      dueLabel: 'Esta fase',
      tone: 'neutral',
      target: 'protocol',
    })
  }

  if (input.nextExam) {
    reminders.push({
      label: input.nextExam.label ?? 'Exame de acompanhamento',
      detail: input.nextExam.timing ?? 'Programe conforme seu acompanhamento.',
      dueLabel: 'Proximo',
      tone: 'neutral',
      target: 'exams',
    })
  }

  if (input.professionalAdjustment?.customDoseSuggestion !== null && input.professionalAdjustment?.customDoseSuggestion !== undefined) {
    reminders.push({
      label: 'Ajuste profissional ativo',
      detail: 'Observe tolerancia e sintomas apos o ajuste enviado.',
      dueLabel: 'Ativo',
      tone: 'good',
      target: 'diary',
    })
  }

  return reminders.slice(0, 4)
}

export function buildPatientRetention(input: PatientRetentionInput): PatientRetention {
  return {
    checkIn: buildCheckIn(input),
    nextActions: buildNextActions(input),
    reminders: buildReminders(input),
  }
}
