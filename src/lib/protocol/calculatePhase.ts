// src/lib/protocol/calculatePhase.ts
// Compatibilidade para telas existentes. O motor completo vive em protocolRules.ts.

import type { ProtocolPhase } from '@/lib/supabase/types'
import { calculateProtocol, type ProgressionStrategy, type ProtocolRiskLevel } from './protocolRules'

export interface PhaseInput {
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

export interface PhaseResult {
  phase: ProtocolPhase
  drops: number
  mg: number
  label: string
  description: string
  cofactors: string[]
  riskLevel: ProtocolRiskLevel
  progressionStrategy: ProgressionStrategy
  alerts: string[]
}

export function calculatePhase(input: PhaseInput): PhaseResult {
  const result = calculateProtocol(input)

  return {
    phase: result.phase,
    drops: result.drops,
    mg: result.mg,
    label: result.label,
    description: result.description,
    cofactors: result.cofactors,
    riskLevel: result.riskLevel,
    progressionStrategy: result.progressionStrategy,
    alerts: result.alerts,
  }
}
