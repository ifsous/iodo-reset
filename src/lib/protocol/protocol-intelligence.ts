import type { ProgressionStrategy, ProtocolPhase, ProtocolRiskLevel, SymptomType } from '@/lib/supabase/types'

export type ProtocolStepStatus = 'done' | 'current' | 'next' | 'blocked'
export type PatientNeedTone = 'safety' | 'foundation' | 'metabolic' | 'detox' | 'monitoring' | 'maintenance'

export interface ProtocolIntelligenceInput {
  phase: ProtocolPhase
  riskLevel: ProtocolRiskLevel
  progressionStrategy: ProgressionStrategy
  recommendedDrops: number
  conditions: string[]
  symptoms: SymptomType[]
  medications: string[]
  cofactorsInUse: string[]
  safetyFlags: string[]
  halogenExposure: string[]
  protocolAlerts: string[]
  recentSignals: {
    redDays: number
    yellowDays: number
    hasPalpitations: boolean
    cofactorReadyDays: number
    loggedDays: number
  }
}

export interface PatientNeed {
  key: string
  title: string
  detail: string
  tone: PatientNeedTone
}

export interface ProtocolStep {
  number: number
  title: string
  explanation: string
  patientAction: string
  status: ProtocolStepStatus
}

export interface ProtocolIntelligence {
  title: string
  summary: string
  currentStage: {
    label: string
    detail: string
  }
  needs: PatientNeed[]
  steps: ProtocolStep[]
  nextBestAction: string
}

function hasAny(values: string[], candidates: string[]) {
  return candidates.some((candidate) => values.includes(candidate))
}

function statusFor(step: number, input: ProtocolIntelligenceInput): ProtocolStepStatus {
  if (input.riskLevel === 'professional_only' && step >= 3) return 'blocked'
  if (input.phase === '0') {
    if (step <= 2) return step === 2 ? 'current' : 'done'
    return 'next'
  }

  if (input.recentSignals.redDays > 0 || input.recentSignals.hasPalpitations) {
    if (step < 5) return 'done'
    return 'current'
  }

  if (input.phase === '4') {
    if (step < 5) return 'done'
    return 'current'
  }

  if (step < 4) return 'done'
  if (step === 4) return 'current'
  return 'next'
}

function pushNeed(target: PatientNeed[], need: PatientNeed) {
  if (!target.some((item) => item.key === need.key)) target.push(need)
}

function buildNeeds(input: ProtocolIntelligenceInput): PatientNeed[] {
  const needs: PatientNeed[] = []
  const metabolicSymptoms = ['extra_fatigue', 'brain_fog', 'cold_intolerance', 'weight_gain', 'constipation', 'dry_skin', 'hair_loss', 'no_sweat']
  const detoxSymptoms = ['headache', 'acne', 'bad_breath', 'urinary_infection', 'menstrual_worsening', 'anxiety']
  const glandularConditions = ['cistos_mamarios', 'sop', 'endometriose', 'miomas', 'prostata']
  const thyroidConditions = ['hashimoto', 'hipotireoidismo', 'hipertireoidismo', 'graves']
  const missingCofactors = ['selenio', 'magnesio'].filter((item) => !input.cofactorsInUse.includes(item))

  if (input.riskLevel === 'professional_only' || input.protocolAlerts.length > 0) {
    pushNeed(needs, {
      key: 'safety',
      title: 'Seguranca primeiro',
      detail: 'Seu perfil tem sinais que pedem cautela antes de iniciar, subir ou retomar dose.',
      tone: 'safety',
    })
  }

  if (missingCofactors.length > 0 || input.progressionStrategy === 'cofactors_first') {
    pushNeed(needs, {
      key: 'cofactors',
      title: 'Base de cofatores',
      detail: 'Selenio, magnesio, vitamina C, B2/B3, agua e sal sustentam tolerancia antes da progressao.',
      tone: 'foundation',
    })
  }

  if (hasAny(input.symptoms, metabolicSymptoms)) {
    pushNeed(needs, {
      key: 'metabolic',
      title: 'Energia e metabolismo',
      detail: 'Cansaco, frio, intestino lento, pele seca, ausencia de suor ou nevoa mental pedem acompanhamento de tendencia.',
      tone: 'metabolic',
    })
  }

  if (hasAny(input.conditions, thyroidConditions) || hasAny(input.medications, ['levotiroxina', 'euthyrox', 'outro_tireoidiano', 'metimazol', 'propiltiouracil'])) {
    pushNeed(needs, {
      key: 'thyroid',
      title: 'Tireoide e exames',
      detail: 'Painel tireoidiano, anticorpos e sintomas devem guiar a prudencia do protocolo.',
      tone: 'monitoring',
    })
  }

  if (hasAny(input.conditions, glandularConditions)) {
    pushNeed(needs, {
      key: 'glandular',
      title: 'Saude glandular',
      detail: 'Historico de cistos, miomas, SOP, endometriose ou prostata pede linha de base e monitoramento.',
      tone: 'monitoring',
    })
  }

  if (input.halogenExposure.filter((item) => item !== 'unknown').length >= 2 || hasAny(input.symptoms, detoxSymptoms)) {
    pushNeed(needs, {
      key: 'halogens',
      title: 'Halogenios e tolerancia',
      detail: 'Fluor, cloro, bromo e sintomas de detox tornam hidratacao, sal e vitamina C mais importantes.',
      tone: 'detox',
    })
  }

  if (needs.length === 0) {
    pushNeed(needs, {
      key: 'maintenance',
      title: 'Manutencao inteligente',
      detail: 'O foco agora e registrar dados, manter cofatores e revisar exames antes de qualquer mudanca.',
      tone: 'maintenance',
    })
  }

  return needs.slice(0, 4)
}

function currentStage(input: ProtocolIntelligenceInput): ProtocolIntelligence['currentStage'] {
  if (input.riskLevel === 'professional_only') {
    return {
      label: 'Etapa 1 - Triagem clinica',
      detail: 'Antes de qualquer dose, organize riscos, medicamentos, exames e acompanhamento profissional.',
    }
  }

  if (input.phase === '0' || input.progressionStrategy === 'cofactors_first' || input.recommendedDrops === 0) {
    return {
      label: 'Etapa 3 - Preparacao e cofatores',
      detail: 'Seu protocolo esta focado em preparar base metabolica antes de usar ou subir iodo.',
    }
  }

  if (input.recentSignals.redDays > 0 || input.recentSignals.hasPalpitations) {
    return {
      label: 'Etapa 5 - Monitoramento e pausa',
      detail: 'Sinais recentes pedem reduzir carga, observar e estabilizar antes de pensar em progressao.',
    }
  }

  if (input.phase === '4') {
    return {
      label: 'Etapa 4 - Estabilizacao',
      detail: 'A prioridade e sustentar rotina, revisar exames e evitar mudancas desnecessarias.',
    }
  }

  return {
    label: 'Etapa 4 - Implementacao progressiva',
    detail: 'A dose atual deve ser mantida ou ajustada conforme tolerancia, cofatores, semaforo e exames.',
  }
}

function nextBestAction(input: ProtocolIntelligenceInput): string {
  if (input.riskLevel === 'professional_only') return 'Organize exames, sintomas e medicamentos antes de iniciar ou retomar iodo.'
  if (input.recentSignals.redDays > 0 || input.recentSignals.hasPalpitations) return 'Pause ou reduza carga hoje, reforce agua, sal e cofatores, e observe sintomas.'
  if (input.phase === '0' || input.progressionStrategy === 'cofactors_first') return 'Complete a base de cofatores e registre alguns dias antes de iniciar o iodo.'
  if (input.recentSignals.yellowDays >= 2) return 'Mantenha a dose atual e procure estabilizar sono, sintomas e cofatores.'
  if (input.recentSignals.loggedDays < 5) return 'Registre o diario por mais dias para a inteligencia entender sua tendencia real.'
  if (input.recentSignals.cofactorReadyDays < 5) return 'Priorize cofatores esta semana antes de qualquer progressao.'
  return 'Mantenha o plano atual e use o diario para confirmar se a tendencia continua estavel.'
}

export function buildProtocolIntelligence(input: ProtocolIntelligenceInput): ProtocolIntelligence {
  const stage = currentStage(input)
  const needs = buildNeeds(input)

  return {
    title: 'Seu protocolo precisa de uma rota, nao de uma dose isolada',
    summary: 'A inteligencia cruza sintomas, cautelas, cofatores, exposicao a halogenios, exames sugeridos e registros recentes para explicar o proximo passo.',
    currentStage: stage,
    needs,
    steps: [
      {
        number: 1,
        title: 'Anamnese e triagem',
        explanation: 'Mapeia sintomas sistemicos, saude glandular, exposicao a halogenios, medicamentos e sinais de cautela.',
        patientAction: 'Mantenha perfil, sintomas e medicamentos atualizados.',
        status: statusFor(1, input),
      },
      {
        number: 2,
        title: 'Linha de base laboratorial',
        explanation: 'Organiza TSH, T4L, T3L, anticorpos, ferritina, selenio, magnesio, B12, vitamina D, PCR e homocisteina quando disponiveis.',
        patientAction: 'Cadastre exames e acompanhe tendencias antes de grandes mudancas.',
        status: statusFor(2, input),
      },
      {
        number: 3,
        title: 'Preparacao e cofatores',
        explanation: 'Prioriza selenio, magnesio, vitamina C longe do iodo, B2/B3, hidratacao e sal conforme tolerancia.',
        patientAction: 'Busque completar os cofatores centrais na rotina.',
        status: statusFor(3, input),
      },
      {
        number: 4,
        title: 'Implementacao progressiva',
        explanation: 'A dose em gotas e mg avanca apenas quando tolerancia, diario, cofatores e risco individual permitem.',
        patientAction: 'Evite subir dose em semaforo amarelo, vermelho ou sintomas fortes.',
        status: statusFor(4, input),
      },
      {
        number: 5,
        title: 'Monitoramento e reacoes',
        explanation: 'Diferencia estabilidade, sinais de detox e sinais de alerta para pausar, reduzir ou buscar avaliacao.',
        patientAction: 'Registre energia, humor, sono, sintomas e sinais de alerta todos os dias.',
        status: statusFor(5, input),
      },
    ],
    nextBestAction: nextBestAction(input),
  }
}
