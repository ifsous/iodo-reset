import type {
  ProgressionStrategy,
  ProtocolPhase,
  ProtocolRiskLevel,
  SemaphoreColor,
  SymptomType,
} from '@/lib/supabase/types'

export type ProgressionCriterionStatus = 'met' | 'partial' | 'blocked'

export interface ProgressionCriterion {
  label: string
  detail: string
  status: ProgressionCriterionStatus
}

export interface ProgressionReadiness {
  title: string
  summary: string
  readinessPercent: number
  nextStep: string
  criteria: ProgressionCriterion[]
}

export interface ProgressionLog {
  log_date: string
  semaphore: SemaphoreColor
  energy: number | null
  mood: number | null
  sleep_quality: number | null
  symptoms: SymptomType[]
  took_selenium: boolean
  took_magnesium: boolean
  took_vitamins: boolean
  took_vitamin_c: boolean
  drank_water: boolean
  used_salt: boolean
}

export interface ProgressionReadinessInput {
  phase: ProtocolPhase
  riskLevel: ProtocolRiskLevel
  progressionStrategy: ProgressionStrategy
  protocolStartDate: string | null
  recentLogs: ProgressionLog[]
}

function average(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value !== null)
  if (valid.length === 0) return null
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function daysSince(date: string | null): number {
  if (!date) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(`${date}T12:00:00`).getTime()) / 86_400_000))
}

function cofactorScore(log: ProgressionLog): number {
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

function criterion(label: string, detail: string, status: ProgressionCriterionStatus): ProgressionCriterion {
  return { label, detail, status }
}

export function buildProgressionReadiness(input: ProgressionReadinessInput): ProgressionReadiness {
  const recent = input.recentLogs.slice(0, 7)
  const loggedDays = recent.length
  const redDays = recent.filter((log) => log.semaphore === 'red').length
  const yellowDays = recent.filter((log) => log.semaphore === 'yellow').length
  const avgEnergy = average(recent.map((log) => log.energy))
  const avgSleep = average(recent.map((log) => log.sleep_quality))
  const cofactorReadyDays = recent.filter((log) => cofactorScore(log) >= 0.8).length
  const hasPalpitations = recent.some((log) => log.symptoms.includes('palpitations'))
  const protocolDays = daysSince(input.protocolStartDate)

  if (input.riskLevel === 'professional_only') {
    return {
      title: 'Avanco depende de acompanhamento',
      summary: 'Seu perfil esta em modo profissional, entao o app acompanha sinais sem liberar progressao automatica.',
      readinessPercent: 0,
      nextStep: 'Leve registros, sintomas e exames para uma decisao supervisionada.',
      criteria: [
        criterion('Seguranca clinica', 'Progressao bloqueada no app por criterio de seguranca.', 'blocked'),
        criterion('Registros recentes', `${loggedDays}/7 dias registrados`, loggedDays >= 5 ? 'met' : 'partial'),
        criterion('Sinais de alerta', hasPalpitations || redDays > 0 ? 'Ha alertas recentes para revisar.' : 'Sem alerta vermelho recente.', hasPalpitations || redDays > 0 ? 'blocked' : 'met'),
      ],
    }
  }

  const criteria: ProgressionCriterion[] = [
    criterion(
      'Consistencia de registros',
      `${loggedDays}/7 dias registrados`,
      loggedDays >= 5 ? 'met' : loggedDays >= 3 ? 'partial' : 'blocked'
    ),
    criterion(
      'Semaforo estavel',
      redDays === 0 ? `${yellowDays} dia(s) amarelo(s), nenhum vermelho` : `${redDays} dia(s) vermelho(s) recente(s)`,
      redDays > 0 ? 'blocked' : yellowDays <= 1 ? 'met' : 'partial'
    ),
    criterion(
      'Cofatores consistentes',
      `${cofactorReadyDays}/7 dias com cofatores quase completos`,
      cofactorReadyDays >= 5 ? 'met' : cofactorReadyDays >= 3 ? 'partial' : 'blocked'
    ),
    criterion(
      'Energia e sono',
      `Energia ${avgEnergy === null ? '-' : avgEnergy.toFixed(1)}/10, sono ${avgSleep === null ? '-' : avgSleep.toFixed(1)}/10`,
      avgEnergy !== null && avgSleep !== null && avgEnergy >= 6 && avgSleep >= 6
        ? 'met'
        : avgEnergy !== null && avgSleep !== null && avgEnergy >= 4 && avgSleep >= 4
          ? 'partial'
          : 'blocked'
    ),
    criterion(
      'Sem palpitações recentes',
      hasPalpitations ? 'Palpitacoes registradas nos ultimos dias' : 'Nenhuma palpitacao recente registrada',
      hasPalpitations ? 'blocked' : 'met'
    ),
  ]

  if (input.phase === '0' || input.progressionStrategy === 'cofactors_first') {
    criteria.unshift(criterion(
      'Tempo de preparacao',
      `${protocolDays} dia(s) desde o inicio do protocolo`,
      protocolDays >= 90 ? 'met' : protocolDays >= 30 ? 'partial' : 'blocked'
    ))
  }

  const metCount = criteria.filter((item) => item.status === 'met').length
  const partialCount = criteria.filter((item) => item.status === 'partial').length
  const readinessPercent = Math.round(((metCount + partialCount * 0.5) / criteria.length) * 100)
  const blocked = criteria.filter((item) => item.status === 'blocked')
  const partial = criteria.filter((item) => item.status === 'partial')

  if (blocked.length > 0) {
    return {
      title: 'Ainda nao e hora de avancar',
      summary: `O principal ponto agora e ${blocked[0].label.toLowerCase()}.`,
      readinessPercent,
      nextStep: blocked[0].detail,
      criteria,
    }
  }

  if (partial.length > 0) {
    return {
      title: 'Quase pronto para avancar',
      summary: `Falta consolidar ${partial[0].label.toLowerCase()} antes de subir a fase ou dose.`,
      readinessPercent,
      nextStep: partial[0].detail,
      criteria,
    }
  }

  return {
    title: 'Pronto para avaliar o proximo passo',
    summary: 'Os sinais recentes estao estaveis o suficiente para revisar a progressao com cautela.',
    readinessPercent,
    nextStep: 'Revise o guia do protocolo antes de qualquer mudanca.',
    criteria,
  }
}
