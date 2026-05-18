import type { SemaphoreColor, SymptomType } from '@/lib/supabase/types'

export type ProgressHistoryTone = 'good' | 'watch' | 'alert' | 'neutral'

export interface ProgressHistoryMetric {
  label: string
  value: string
  detail: string
  tone: ProgressHistoryTone
}

export interface ProgressHistoryEvent {
  label: string
  detail: string
  tone: ProgressHistoryTone
}

export interface ProgressHistory {
  title: string
  summary: string
  metrics: ProgressHistoryMetric[]
  events: ProgressHistoryEvent[]
}

export interface ProgressHistoryLog {
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

function average(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value !== null)
  if (valid.length === 0) return null
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function cofactorScore(log: ProgressHistoryLog): number {
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

function formatShortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

function stableStreak(logs: ProgressHistoryLog[]): number {
  let count = 0
  for (const log of logs) {
    if (log.semaphore === 'red' || log.symptoms.includes('palpitations')) break
    count += 1
  }
  return count
}

function energyTrend(logs: ProgressHistoryLog[]): { label: string; detail: string; tone: ProgressHistoryTone } {
  const latest = average(logs.slice(0, 3).map((log) => log.energy))
  const previous = average(logs.slice(3, 6).map((log) => log.energy))

  if (latest === null || previous === null) {
    return {
      label: 'sem dados',
      detail: 'Registre energia por mais alguns dias.',
      tone: 'neutral',
    }
  }

  const diff = latest - previous
  if (diff >= 1) {
    return {
      label: 'subindo',
      detail: `Energia recente ${latest.toFixed(1)}/10, antes ${previous.toFixed(1)}/10.`,
      tone: 'good',
    }
  }

  if (diff <= -1) {
    return {
      label: 'caindo',
      detail: `Energia recente ${latest.toFixed(1)}/10, antes ${previous.toFixed(1)}/10.`,
      tone: 'watch',
    }
  }

  return {
    label: 'estavel',
    detail: `Energia recente ${latest.toFixed(1)}/10, antes ${previous.toFixed(1)}/10.`,
    tone: 'neutral',
  }
}

export function buildProgressHistory(logs: ProgressHistoryLog[]): ProgressHistory {
  const recent = logs.slice(0, 30)
  const week = recent.slice(0, 7)
  const loggedDays = week.length
  const stableDays = stableStreak(recent)
  const cofactorReadyDays = week.filter((log) => cofactorScore(log) >= 0.8).length
  const redDays = week.filter((log) => log.semaphore === 'red').length
  const yellowDays = week.filter((log) => log.semaphore === 'yellow').length
  const lastAlert = recent.find((log) => log.semaphore === 'red' || log.symptoms.includes('palpitations'))
  const trend = energyTrend(recent)

  const metrics: ProgressHistoryMetric[] = [
    {
      label: 'Dias estaveis',
      value: `${stableDays}`,
      detail: stableDays === 1 ? 'dia sem vermelho ou palpitacao' : 'dias sem vermelho ou palpitacao',
      tone: stableDays >= 7 ? 'good' : stableDays >= 3 ? 'neutral' : 'watch',
    },
    {
      label: 'Cofatores',
      value: `${cofactorReadyDays}/7`,
      detail: 'dias quase completos na semana',
      tone: cofactorReadyDays >= 5 ? 'good' : cofactorReadyDays >= 3 ? 'watch' : 'alert',
    },
    {
      label: 'Semaforo',
      value: redDays > 0 ? `${redDays} vermelho` : `${yellowDays} amarelo`,
      detail: redDays > 0 ? 'na semana recente' : 'e nenhum vermelho',
      tone: redDays > 0 ? 'alert' : yellowDays > 1 ? 'watch' : 'good',
    },
    {
      label: 'Energia',
      value: trend.label,
      detail: trend.detail,
      tone: trend.tone,
    },
  ]

  const events: ProgressHistoryEvent[] = [
    {
      label: 'Registro recente',
      detail: loggedDays > 0 ? `${loggedDays}/7 dias registrados nesta semana.` : 'Ainda sem registros recentes.',
      tone: loggedDays >= 5 ? 'good' : loggedDays >= 3 ? 'watch' : 'neutral',
    },
    {
      label: 'Ultimo alerta',
      detail: lastAlert
        ? `${formatShortDate(lastAlert.log_date)}: ${lastAlert.semaphore === 'red' ? 'semaforo vermelho' : 'palpitacao registrada'}.`
        : 'Nenhum alerta forte nos ultimos registros.',
      tone: lastAlert ? 'alert' : 'good',
    },
    {
      label: 'Maior trava agora',
      detail: redDays > 0
        ? 'Estabilizar sinais vermelhos antes de pensar em avanço.'
        : cofactorReadyDays < 5
          ? 'Completar cofatores com mais consistencia.'
          : loggedDays < 5
            ? 'Registrar mais dias para confirmar o padrao.'
            : 'Manter estabilidade e revisar o proximo passo.',
      tone: redDays > 0 ? 'alert' : cofactorReadyDays < 5 || loggedDays < 5 ? 'watch' : 'good',
    },
  ]

  return {
    title: recent.length > 0 ? 'Seu progresso recente' : 'Comece seu historico',
    summary: recent.length > 0
      ? 'Um resumo dos sinais que mostram se o protocolo esta ficando mais estavel.'
      : 'Registre alguns dias para o app identificar padroes de evolucao.',
    metrics,
    events,
  }
}
