import type { Json, ProtocolPhase } from '@/lib/supabase/types'

export type ProtocolRiskLevel = 'standard' | 'caution' | 'professional_only'
export type ProgressionStrategy = 'cofactors_first' | 'slow' | 'standard' | 'supervised'

export interface ProtocolRuleInput {
  birthYear: number
  conditions: string[]
  symptoms?: string[]
  medications?: string[]
  cofactorsInUse?: string[]
  priorIodineExp?: boolean
  hasProfessional?: boolean
  halogenExposure?: string[]
  safetyFlags?: string[]
}

export interface ExamScheduleItem {
  key: string
  label: string
  timing: string
  priority: 'baseline' | 'follow_up' | 'optional'
}

export interface ProtocolRuleResult {
  phase: ProtocolPhase
  drops: number
  mg: number
  label: string
  description: string
  cofactors: string[]
  riskLevel: ProtocolRiskLevel
  progressionStrategy: ProgressionStrategy
  alerts: string[]
  examSchedule: ExamScheduleItem[]
}

const PHASE_LABELS: Record<ProtocolPhase, string> = {
  '0': 'Pre-protocolo - Cofatores',
  '1': 'Fase 1 - Ativacao',
  '2': 'Fase 2 - Progressao',
  '3': 'Fase 3 - Detox profundo',
  '4': 'Fase 4 - Estabilizacao',
}

const BASE_COFACTORS = [
  'Selenio (200 mcg/dia)',
  'Magnesio (400 mg/dia)',
  'Vitamina C (2g/dia)',
  'Vitaminas B2 + B3',
  'Vitamina D3 + K2',
  'Agua + sal integral conforme tolerancia',
]

const BASELINE_EXAMS: ExamScheduleItem[] = [
  { key: 'thyroid_panel', label: 'TSH, T4 livre e T3 livre', timing: 'Antes de iniciar e a cada 30-60 dias', priority: 'baseline' },
  { key: 'thyroid_antibodies', label: 'Anti-TPO e Anti-Tg', timing: 'Antes de iniciar se houver autoimunidade ou sintomas tireoidianos', priority: 'baseline' },
  { key: 'selenium', label: 'Selenio', timing: 'Antes de iniciar e durante ajuste de cofatores', priority: 'baseline' },
  { key: 'ferritin', label: 'Ferritina', timing: 'Antes de iniciar se houver fadiga, queda de cabelo ou ciclo intenso', priority: 'baseline' },
  { key: 'vitamin_d', label: 'Vitamina D 25-OH', timing: 'Antes de iniciar e a cada 60-90 dias', priority: 'follow_up' },
  { key: 'magnesium', label: 'Magnesio', timing: 'Antes de iniciar se possivel; repetir conforme sintomas', priority: 'follow_up' },
]

function hasAny(values: string[], candidates: string[]) {
  return candidates.some((candidate) => values.includes(candidate))
}

function pushUnique(target: string[], value: string) {
  if (!target.includes(value)) target.push(value)
}

export function calculateProtocol(input: ProtocolRuleInput): ProtocolRuleResult {
  const currentYear = new Date().getFullYear()
  const age = currentYear - input.birthYear
  const conditions = input.conditions ?? []
  const symptoms = input.symptoms ?? []
  const medications = input.medications ?? []
  const cofactors = input.cofactorsInUse ?? []
  const safetyFlags = input.safetyFlags ?? []
  const halogens = input.halogenExposure ?? []
  const alerts: string[] = []

  const hasProfessional = input.hasProfessional === true
  const hasHashimoto = conditions.includes('hashimoto')
  const hasHyperthyroid = conditions.includes('hipertireoidismo')
  const hasGraves = conditions.includes('graves') || safetyFlags.includes('graves')
  const isPregnantOrBreastfeeding = safetyFlags.includes('pregnancy') || safetyFlags.includes('breastfeeding')
  const hasRenalOrPressureRisk = safetyFlags.includes('kidney_disease') || safetyFlags.includes('hypertension')
  const hasPalpitations = symptoms.includes('palpitations') || safetyFlags.includes('palpitations_history')
  const usesAntithyroid = hasAny(medications, ['metimazol', 'propiltiouracil'])
  const usesThyroidMed = hasAny(medications, ['levotiroxina', 'euthyrox', 'outro_tireoidiano'])
  const lowCofactorBase = !cofactors.includes('selenio') || !cofactors.includes('magnesio')
  const highHalogenLoad = halogens.length >= 2
  const hasHormonalCondition = hasAny(conditions, ['cistos_mamarios', 'sop', 'endometriose', 'miomas', 'prostata'])

  let riskLevel: ProtocolRiskLevel = 'standard'
  let progressionStrategy: ProgressionStrategy = 'standard'
  let phase: ProtocolPhase = '1'
  let drops = age < 30 ? 4 : 4

  if (hasGraves || hasHyperthyroid || usesAntithyroid || isPregnantOrBreastfeeding) {
    riskLevel = 'professional_only'
    progressionStrategy = 'supervised'
    phase = '0'
    drops = 0
    pushUnique(alerts, 'Nao iniciar iodo sem acompanhamento profissional.')
  }

  if (hasHashimoto || hasRenalOrPressureRisk || hasPalpitations) {
    riskLevel = riskLevel === 'professional_only' ? riskLevel : 'caution'
    progressionStrategy = hasProfessional ? 'slow' : 'cofactors_first'
    phase = '0'
    drops = 0
    pushUnique(alerts, 'Priorizar cofatores e monitoramento antes de iniciar ou subir dose.')
  }

  if (lowCofactorBase && riskLevel !== 'professional_only') {
    riskLevel = riskLevel === 'standard' ? 'caution' : riskLevel
    progressionStrategy = 'cofactors_first'
    phase = '0'
    drops = 0
    pushUnique(alerts, 'Base de selenio e magnesio incompleta: preparar cofatores primeiro.')
  }

  if (riskLevel === 'standard') {
    if (hasHormonalCondition) {
      drops = 4
      progressionStrategy = input.priorIodineExp ? 'standard' : 'slow'
    } else if (usesThyroidMed) {
      drops = 1
      progressionStrategy = 'slow'
      riskLevel = 'caution'
      pushUnique(alerts, 'Uso de medicamento tireoidiano pede progressao conservadora e exames.')
    }
  }

  if (highHalogenLoad) {
    pushUnique(alerts, 'Alta exposicao a halogenios: reforcar agua, sal e cofatores no acompanhamento.')
  }

  const description = phase === '0'
    ? 'Comece pelo preparo: cofatores, hidratacao, sal conforme tolerancia e exames de base antes de iniciar iodo.'
    : progressionStrategy === 'slow'
      ? 'Inicio conservador com progressao lenta, guiada por sintomas, cofatores e exames.'
      : 'Inicio padrao com acompanhamento diario de sintomas, cofatores e semaforo.'

  return {
    phase,
    drops,
    mg: drops * 6.25,
    label: PHASE_LABELS[phase],
    description,
    cofactors: BASE_COFACTORS,
    riskLevel,
    progressionStrategy,
    alerts,
    examSchedule: BASELINE_EXAMS,
  }
}

export function examScheduleToJson(schedule: ExamScheduleItem[]): Json[] {
  return schedule.map((item) => ({
    key: item.key,
    label: item.label,
    timing: item.timing,
    priority: item.priority,
  }))
}
