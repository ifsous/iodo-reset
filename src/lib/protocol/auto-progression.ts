import { buildProgressionReadiness, type ProgressionLog } from '@/lib/protocol/progression-readiness'
import type { ProgressionStrategy, ProtocolPhase, ProtocolRiskLevel, SemaphoreColor, SymptomType } from '@/lib/supabase/types'

export type ProtocolProgressionSource = 'auto' | 'professional'

export interface AutoProgressionProfile {
  phase: ProtocolPhase
  recommended_dose_drops: number
  protocol_start_date: string | null
  protocol_risk_level: ProtocolRiskLevel
  progression_strategy: ProgressionStrategy
}

export interface AutoProgressionLog extends ProgressionLog {
  dose_drops: number
  semaphore: SemaphoreColor
  symptoms: SymptomType[]
}

export interface ProtocolProgressionDecision {
  shouldUpdate: boolean
  toPhase: ProtocolPhase
  toDoseDrops: number
  toProgressionStrategy?: ProgressionStrategy
  reason: string
  metadata: Record<string, unknown>
}

const NEXT_PHASE: Partial<Record<ProtocolPhase, ProtocolPhase>> = {
  '0': '1',
  '1': '2',
  '2': '3',
  '3': '4',
}

const PHASE_DOSE_CAP: Record<ProtocolPhase, number> = {
  '0': 0,
  '1': 4,
  '2': 6,
  '3': 8,
  '4': 8,
}

function cofactorScore(log: AutoProgressionLog): number {
  return [
    log.took_selenium,
    log.took_magnesium,
    log.took_vitamins,
    log.took_vitamin_c,
    log.drank_water,
    log.used_salt,
  ].filter(Boolean).length / 6
}

function hasRecentProfessionalEvent(lastEvent: { source: ProtocolProgressionSource; created_at: string } | null) {
  if (!lastEvent || lastEvent.source !== 'professional') return false
  const ageMs = Date.now() - new Date(lastEvent.created_at).getTime()
  return ageMs < 7 * 86_400_000
}

function hasRecentAutoEvent(lastEvent: { source: ProtocolProgressionSource; created_at: string } | null) {
  if (!lastEvent || lastEvent.source !== 'auto') return false
  const ageMs = Date.now() - new Date(lastEvent.created_at).getTime()
  return ageMs < 7 * 86_400_000
}

function progressionStep(strategy: ProgressionStrategy, riskLevel: ProtocolRiskLevel) {
  if (riskLevel === 'caution' || strategy === 'slow' || strategy === 'supervised') return 1
  return 2
}

export function decideAutoProgression(input: {
  profile: AutoProgressionProfile
  recentLogs: AutoProgressionLog[]
  hasActiveProfessionalDose: boolean
  lastEvent: { source: ProtocolProgressionSource; created_at: string } | null
}): ProtocolProgressionDecision {
  const { profile } = input
  const currentDose = Math.max(0, profile.recommended_dose_drops ?? 0)
  const currentPhase = profile.phase
  const recent = input.recentLogs.slice(0, 7)
  const latestLog = recent[0] ?? null
  const redDays = recent.filter((log) => log.semaphore === 'red').length
  const yellowDays = recent.filter((log) => log.semaphore === 'yellow').length
  const hasPalpitations = recent.some((log) => log.symptoms.includes('palpitations'))
  const cofactorReadyDays = recent.filter((log) => cofactorScore(log) >= 0.8).length

  if (profile.protocol_risk_level === 'professional_only') {
    return {
      shouldUpdate: false,
      toPhase: currentPhase,
      toDoseDrops: currentDose,
      reason: 'Progressao automatica bloqueada por criterio profissional.',
      metadata: { blocked_by: 'professional_only' },
    }
  }

  if (input.hasActiveProfessionalDose || hasRecentProfessionalEvent(input.lastEvent)) {
    return {
      shouldUpdate: false,
      toPhase: currentPhase,
      toDoseDrops: currentDose,
      reason: 'Ajuste profissional recente ativo; progressao automatica nao sobrescreveu o perfil.',
      metadata: { blocked_by: 'professional_adjustment' },
    }
  }

  if (latestLog && (latestLog.semaphore === 'red' || redDays > 0 || hasPalpitations)) {
    const safetyDose = Math.max(0, Math.min(currentDose - 1, latestLog.dose_drops - 1))
    if (safetyDose < currentDose) {
      return {
        shouldUpdate: true,
        toPhase: currentPhase,
        toDoseDrops: safetyDose,
        reason: hasPalpitations
          ? 'Dose reduzida automaticamente por palpitacoes registradas.'
          : 'Dose reduzida automaticamente por sinal vermelho recente.',
        metadata: { red_days: redDays, has_palpitations: hasPalpitations, latest_log_date: latestLog.log_date },
      }
    }
  }

  if (hasRecentAutoEvent(input.lastEvent)) {
    return {
      shouldUpdate: false,
      toPhase: currentPhase,
      toDoseDrops: currentDose,
      reason: 'Progressao automatica recente ja aplicada.',
      metadata: { blocked_by: 'recent_auto_event' },
    }
  }

  const readiness = buildProgressionReadiness({
    phase: currentPhase,
    riskLevel: profile.protocol_risk_level,
    progressionStrategy: profile.progression_strategy,
    protocolStartDate: profile.protocol_start_date,
    recentLogs: recent,
  })
  const hasBlockedOrPartial = readiness.criteria.some((criterion) => criterion.status !== 'met')
  const nextPhase = NEXT_PHASE[currentPhase]

  if (!nextPhase || hasBlockedOrPartial || recent.length < 5) {
    return {
      shouldUpdate: false,
      toPhase: currentPhase,
      toDoseDrops: currentDose,
      reason: readiness.nextStep,
      metadata: {
        readiness_percent: readiness.readinessPercent,
        yellow_days: yellowDays,
        cofactor_ready_days: cofactorReadyDays,
        logged_days: recent.length,
      },
    }
  }

  const nextStrategy = currentPhase === '0' && profile.progression_strategy === 'cofactors_first'
    ? 'slow'
    : undefined
  const targetDose = currentPhase === '0'
    ? 1
    : Math.min(PHASE_DOSE_CAP[nextPhase], currentDose + progressionStep(profile.progression_strategy, profile.protocol_risk_level))

  if (nextPhase === currentPhase && targetDose === currentDose && !nextStrategy) {
    return {
      shouldUpdate: false,
      toPhase: currentPhase,
      toDoseDrops: currentDose,
      reason: 'Perfil ja esta no alvo calculado.',
      metadata: { readiness_percent: readiness.readinessPercent },
    }
  }

  return {
    shouldUpdate: true,
    toPhase: nextPhase,
    toDoseDrops: targetDose,
    toProgressionStrategy: nextStrategy,
    reason: `Progressao automatica: ${readiness.title.toLowerCase()}.`,
    metadata: {
      readiness_percent: readiness.readinessPercent,
      yellow_days: yellowDays,
      cofactor_ready_days: cofactorReadyDays,
      logged_days: recent.length,
      latest_log_date: latestLog?.log_date ?? null,
    },
  }
}
