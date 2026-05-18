import type { PlanType } from '@/lib/supabase/types'

export const AI_FREE_LIMIT = 6
export const AI_PRO_MONTHLY_LIMIT = 100

export type AiLimitWindow = 'lifetime' | 'monthly' | 'unlimited'

export interface AiLimitPolicy {
  limit: number | null
  window: AiLimitWindow
}

export function getAiLimitPolicy(plan: PlanType | null | undefined): AiLimitPolicy {
  if (plan === 'clinic') {
    return { limit: null, window: 'unlimited' }
  }

  if (plan === 'pro') {
    return { limit: AI_PRO_MONTHLY_LIMIT, window: 'monthly' }
  }

  return { limit: AI_FREE_LIMIT, window: 'lifetime' }
}

export function getCurrentMonthStart(): string {
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)
  return monthStart.toISOString()
}
