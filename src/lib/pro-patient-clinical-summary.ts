import type { AlertLevel, SemaphoreColor, SymptomType } from '@/lib/supabase/types'

export type ClinicalSummaryTone = 'stable' | 'attention' | 'urgent'

export type ProPatientSignalLog = {
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
}

export type ProPatientClinicalSummary = {
  tone: ClinicalSummaryTone
  title: string
  narrative: string
  primarySignal: string
  nextBestAction: string
  messageSuggestion: string
  flags: {
    label: string
    detail: string
    tone: ClinicalSummaryTone
  }[]
  metrics: {
    daysWithoutLog: number | null
    greenDays: number
    yellowDays: number
    redDays: number
    averageEnergy: number | null
    averageMood: number | null
    averageSleep: number | null
    cofactorAdherencePct: number | null
    aiExamInterpretations: number
  }
}

type ClinicalSummaryInput = {
  patientName: string
  alertLevel: AlertLevel
  customDoseSuggestion: number | null
  recommendedDoseDrops: number | null
  logs: ProPatientSignalLog[]
  exams: {
    aiInterpretation: string | null
    isWithinRange: boolean | null
  }[]
}

function average(values: Array<number | null | undefined>) {
  const numbers = values.filter((value): value is number => typeof value === 'number')
  if (numbers.length === 0) return null

  return Math.round((numbers.reduce((total, value) => total + value, 0) / numbers.length) * 10) / 10
}

function daysSince(date: string | null | undefined) {
  if (!date) return null

  const today = new Date()
  const day = new Date(date + 'T12:00:00')
  const diff = today.getTime() - day.getTime()

  return Math.max(0, Math.floor(diff / 86_400_000))
}

function cofactorPct(logs: ProPatientSignalLog[]) {
  if (logs.length === 0) return null

  const total = logs.reduce((sum, log) => {
    const completed = [
      log.tookSelenium,
      log.tookMagnesium,
      log.tookVitamins,
      log.tookVitaminC,
      log.drankWater,
      log.usedSalt,
    ].filter(Boolean).length

    return sum + completed / 6
  }, 0)

  return Math.round((total / logs.length) * 100)
}

export function buildProPatientClinicalSummary(input: ClinicalSummaryInput): ProPatientClinicalSummary {
  const recentLogs = input.logs.slice(0, 7)
  const daysWithoutLog = daysSince(recentLogs[0]?.logDate)
  const greenDays = recentLogs.filter((log) => log.semaphore === 'green').length
  const yellowDays = recentLogs.filter((log) => log.semaphore === 'yellow').length
  const redDays = recentLogs.filter((log) => log.semaphore === 'red').length
  const averageEnergy = average(recentLogs.map((log) => log.energy))
  const averageMood = average(recentLogs.map((log) => log.mood))
  const averageSleep = average(recentLogs.map((log) => log.sleepQuality))
  const cofactorAdherencePct = cofactorPct(recentLogs)
  const aiExamInterpretations = input.exams.filter((exam) => Boolean(exam.aiInterpretation)).length
  const outOfRangeExams = input.exams.filter((exam) => exam.isWithinRange === false).length
  const symptomAlerts = recentLogs.some((log) => log.symptoms.some((symptom) => symptom === 'palpitations' || symptom === 'anxiety'))

  const needsContact = daysWithoutLog !== null && daysWithoutLog >= 3
  const lowVitality = (averageEnergy !== null && averageEnergy <= 4) || (averageMood !== null && averageMood <= 4)
  const incompleteCofactors = cofactorAdherencePct !== null && cofactorAdherencePct < 70
  const hasDoseAdjustment = input.customDoseSuggestion !== null

  const tone: ClinicalSummaryTone = input.alertLevel === 'urgent' || redDays > 0 || symptomAlerts
    ? 'urgent'
    : needsContact || yellowDays >= 2 || lowVitality || outOfRangeExams > 0
      ? 'attention'
      : 'stable'

  const flags: ProPatientClinicalSummary['flags'] = []

  if (redDays > 0) {
    flags.push({
      label: 'Semaforo vermelho',
      detail: `${redDays} registro${redDays === 1 ? '' : 's'} vermelho${redDays === 1 ? '' : 's'} nos ultimos 7 dias.`,
      tone: 'urgent',
    })
  }

  if (symptomAlerts) {
    flags.push({
      label: 'Sintoma sensivel',
      detail: 'Ha ansiedade ou palpitacoes nos relatos recentes.',
      tone: 'urgent',
    })
  }

  if (needsContact) {
    flags.push({
      label: 'Check-in atrasado',
      detail: `Sem registro diario ha ${daysWithoutLog} dias.`,
      tone: 'attention',
    })
  }

  if (yellowDays >= 2) {
    flags.push({
      label: 'Oscilacao recorrente',
      detail: `${yellowDays} dias amarelos na janela recente.`,
      tone: 'attention',
    })
  }

  if (lowVitality) {
    flags.push({
      label: 'Vitalidade baixa',
      detail: `Energia media ${averageEnergy ?? '-'} e humor medio ${averageMood ?? '-'}.`,
      tone: 'attention',
    })
  }

  if (incompleteCofactors) {
    flags.push({
      label: 'Cofatores incompletos',
      detail: `Aderencia media de ${cofactorAdherencePct}% nos itens de suporte.`,
      tone: 'attention',
    })
  }

  if (outOfRangeExams > 0) {
    flags.push({
      label: 'Exames fora da faixa',
      detail: `${outOfRangeExams} exame${outOfRangeExams === 1 ? '' : 's'} marcado${outOfRangeExams === 1 ? '' : 's'} fora da referencia.`,
      tone: 'attention',
    })
  }

  if (hasDoseAdjustment) {
    flags.push({
      label: 'Ajuste ativo',
      detail: `Dose profissional sugerida: ${input.customDoseSuggestion} gotas.`,
      tone: 'stable',
    })
  }

  if (flags.length === 0) {
    flags.push({
      label: 'Sem alerta imediato',
      detail: 'A janela recente nao mostra sinal critico de acompanhamento.',
      tone: 'stable',
    })
  }

  const title = tone === 'urgent'
    ? 'Revisar antes do proximo ajuste'
    : tone === 'attention'
      ? 'Acompanhar nos proximos dias'
      : 'Paciente estavel no acompanhamento'

  const primarySignal = redDays > 0
    ? 'Prioridade no semaforo vermelho.'
    : needsContact
      ? 'Prioridade em recuperar o check-in diario.'
      : lowVitality
        ? 'Prioridade em energia, humor e tolerancia.'
        : incompleteCofactors
          ? 'Prioridade em reforcar cofatores antes de subir dose.'
          : 'Prioridade em manter consistencia e observar tendencia.'

  const nextBestAction = tone === 'urgent'
    ? 'Revisar sintomas, dose e exames antes de orientar progressao.'
    : needsContact
      ? 'Enviar um pedido simples de check-in e revisar resposta antes de ajuste.'
      : incompleteCofactors
        ? 'Reforcar cofatores e manutencao da dose atual por alguns dias.'
        : outOfRangeExams > 0
          ? 'Revisar exames recentes antes de alterar a dose.'
          : 'Manter acompanhamento e registrar a proxima decisao no ajuste profissional.'

  const doseText = hasDoseAdjustment
    ? `${input.customDoseSuggestion} gotas conforme ajuste profissional`
    : `${input.recommendedDoseDrops ?? '-'} gotas do protocolo atual`

  const messageSuggestion = `Oi, ${input.patientName}. Revisei seus sinais recentes. Por agora, mantenha ${doseText}, registre o check-in de hoje e observe energia, humor, sono e qualquer sintoma diferente. Se aparecer sinal vermelho, pause a progressao e me avise.`

  const narrative = tone === 'urgent'
    ? 'Ha sinal que pede revisao profissional antes de qualquer progressao de dose.'
    : tone === 'attention'
      ? 'O padrao recente sugere acompanhar de perto antes de liberar nova subida.'
      : 'Os sinais recentes parecem compativeis com manutencao do acompanhamento atual.'

  return {
    tone,
    title,
    narrative,
    primarySignal,
    nextBestAction,
    messageSuggestion,
    flags,
    metrics: {
      daysWithoutLog,
      greenDays,
      yellowDays,
      redDays,
      averageEnergy,
      averageMood,
      averageSleep,
      cofactorAdherencePct,
      aiExamInterpretations,
    },
  }
}
