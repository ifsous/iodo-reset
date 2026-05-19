import type { AlertLevel, SemaphoreColor } from '@/lib/supabase/types'

export type ProTriageLevel = 'urgent' | 'attention' | 'follow_up' | 'stable'

export interface ProTriageInput {
  status: string
  alertLevel: AlertLevel
  lastLogDate: string | null
  lastSemaphore: SemaphoreColor | null
  lastEnergy: number | null
  lastMood: number | null
  proNotes: string | null
  guidancePending?: boolean
}

export interface ProTriage {
  level: ProTriageLevel
  score: number
  label: string
  reason: string
  nextAction: string
  daysWithoutLog: number | null
}

function daysSince(date: string | null): number | null {
  if (!date) return null
  const today = new Date()
  const then = new Date(`${date}T12:00:00`)
  const diff = Math.round((today.getTime() - then.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

export function buildProTriage(input: ProTriageInput): ProTriage {
  const daysWithoutLog = daysSince(input.lastLogDate)
  let score = 0
  const reasons: string[] = []

  if (input.status !== 'active') {
    score += 20
    reasons.push('vinculo ainda nao ativo')
  }

  if (input.alertLevel === 'urgent') {
    score += 80
    reasons.push('alerta clinico urgente')
  } else if (input.alertLevel === 'attention') {
    score += 45
    reasons.push('sinal de atencao')
  }

  if (input.lastSemaphore === 'red') {
    score += 50
    reasons.push('ultimo semaforo vermelho')
  } else if (input.lastSemaphore === 'yellow') {
    score += 25
    reasons.push('ultimo semaforo amarelo')
  }

  if (daysWithoutLog === null) {
    score += 35
    reasons.push('sem registro ainda')
  } else if (daysWithoutLog >= 7) {
    score += 35
    reasons.push(`${daysWithoutLog} dias sem registro`)
  } else if (daysWithoutLog >= 3) {
    score += 18
    reasons.push(`${daysWithoutLog} dias sem check-in`)
  }

  if ((input.lastEnergy !== null && input.lastEnergy <= 3) || (input.lastMood !== null && input.lastMood <= 3)) {
    score += 20
    reasons.push('energia ou humor muito baixo')
  }

  if (input.proNotes) {
    score += 5
  }

  if (input.guidancePending) {
    score += 30
    reasons.push('orientacao sem retorno')
  }

  if (score >= 90) {
    return {
      level: 'urgent',
      score,
      label: 'Prioridade alta',
      reason: reasons[0] ?? 'revisao clinica recomendada',
      nextAction: 'Abrir paciente e revisar sinais antes do proximo ajuste.',
      daysWithoutLog,
    }
  }

  if (score >= 45) {
    return {
      level: 'attention',
      score,
      label: 'Acompanhar hoje',
      reason: reasons[0] ?? 'ha pontos para revisar',
      nextAction: 'Ver diario recente e decidir se precisa orientar pausa, cofatores ou exame.',
      daysWithoutLog,
    }
  }

  if (score >= 18) {
    return {
      level: 'follow_up',
      score,
      label: 'Follow-up',
      reason: reasons[0] ?? 'manter contato',
      nextAction: 'Estimular novo check-in e manter acompanhamento.',
      daysWithoutLog,
    }
  }

  return {
    level: 'stable',
    score,
    label: 'Estavel',
    reason: 'sem pendencias importantes',
    nextAction: 'Manter rotina e revisar no proximo registro.',
    daysWithoutLog,
  }
}
