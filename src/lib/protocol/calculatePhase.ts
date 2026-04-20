// src/lib/protocol/calculatePhase.ts
// Função pura — sem dependências externas, totalmente testável
// Baseada no Protocolo IODO RESET (Lugol 5% — 1 gota = 6,25 mg)

import type { ProtocolPhase } from '@/lib/supabase/types'

export interface PhaseInput {
  birthYear:  number
  conditions: string[]
}

export interface PhaseResult {
  phase:        ProtocolPhase
  drops:        number        // gotas de Lugol 5%/dia
  mg:           number        // equivalente em mg
  label:        string        // nome da fase
  description:  string        // orientação curta
  cofactors:    string[]      // cofatores prioritários para esta fase
}

const PHASE_LABELS: Record<ProtocolPhase, string> = {
  '0': 'Pré-protocolo — Cofatores',
  '1': 'Fase 1 — Ativação',
  '2': 'Fase 2 — Progressão',
  '3': 'Fase 3 — Detox profundo',
  '4': 'Fase 4 — Estabilização',
}

const BASE_COFACTORS = [
  'Selênio (200 mcg/dia)',
  'Magnésio (400 mg/dia)',
  'Vitamina C (2g/dia)',
  'Vitaminas B2 + B3',
  'Vitamina D3 + K2',
  'Sal integral (1/2 col. chá/dia)',
]

export function calculatePhase({ birthYear, conditions }: PhaseInput): PhaseResult {
  const currentYear = new Date().getFullYear()
  const age         = currentYear - birthYear

  const has = (c: string) => conditions.includes(c)

  // ── Fase 0: condições que exigem preparo antes de iniciar iodo ──
  if (has('hashimoto') || has('hipertireoidismo')) {
    return {
      phase:       '0',
      drops:       0,
      mg:          0,
      label:       PHASE_LABELS['0'],
      description: has('hashimoto')
        ? 'Com Hashimoto, é essencial preparar o organismo com cofatores por 3 meses antes de iniciar o iodo. Isso reduz risco de flare autoimune.'
        : 'Com hipertireoidismo ativo, o iodo deve ser iniciado somente com acompanhamento médico especializado.',
      cofactors: [
        'Selênio (200–400 mcg/dia) — PRIORITÁRIO',
        'Magnésio (400 mg/dia)',
        'Vitamina D3 + K2',
        'Vitaminas B2 + B3',
        'Vitamina C (1–2g/dia)',
      ],
    }
  }

  // ── Fase 1: hipotireoidismo — dose baixa, progressão lenta ──
  if (has('hipotireoidismo')) {
    return {
      phase:       '1',
      drops:       1,
      mg:          6.25,
      label:       PHASE_LABELS['1'],
      description: 'Com hipotireoidismo, iniciamos com dose mínima (1 gota) para permitir adaptação gradual da tireoide. Progressão quinzenal conforme tolerância.',
      cofactors:   BASE_COFACTORS,
    }
  }

  // ── Fase 1: condições femininas — dose moderada ──
  if (
    has('cistos_mamarios') ||
    has('sop')             ||
    has('endometriose')    ||
    has('miomas')
  ) {
    return {
      phase:       '1',
      drops:       2,
      mg:          12.5,
      label:       PHASE_LABELS['1'],
      description: 'Para condições hormonais femininas, 2 gotas é a dose inicial ideal. O iodo auxilia na modulação estrogênica e redução de tecido fibrocístico.',
      cofactors:   BASE_COFACTORS,
    }
  }

  // ── Fase 1: adulto saudável — dose por faixa etária ──
  const drops = age < 30 ? 2 : 3
  const mg    = drops * 6.25

  return {
    phase:       '1',
    drops,
    mg,
    label:       PHASE_LABELS['1'],
    description: age < 30
      ? 'Adulto jovem saudável: 2 gotas é a dose inicial recomendada. Organismo jovem tende a responder bem e progredir com mais agilidade.'
      : 'Adulto acima de 30 anos: 3 gotas como dose inicial. A demanda tecidual por iodo aumenta com a idade e o grau de deficiência tende a ser maior.',
    cofactors: BASE_COFACTORS,
  }
}
