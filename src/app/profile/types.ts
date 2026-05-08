import type {
  Json,
  PlanType,
  ProgressionStrategy,
  ProtocolPhase,
  ProtocolRiskLevel,
  SexType,
  SymptomType,
} from '@/lib/supabase/types'

export interface ProfileData {
  user: {
    id: string
    email: string
    fullName: string | null
    plan: PlanType
    isProfessional: boolean
  }
  profile: {
    birthYear: number | null
    sex: SexType | null
    weightKg: number | null
    conditions: string[]
    medications: string[]
    currentSymptoms: SymptomType[]
    mainGoal: string | null
    priorIodineExp: boolean
    cofactorsInUse: string[]
    safetyFlags: string[]
    halogenExposure: string[]
    hasProfessionalFollowup: boolean
    protocolRiskLevel: ProtocolRiskLevel
    progressionStrategy: ProgressionStrategy
    protocolAlerts: string[]
    examSchedule: Json
    phase: ProtocolPhase
    protocolStartDate: string | null
    recommendedDoseDrops: number
    proNotes: string | null
  }
}
