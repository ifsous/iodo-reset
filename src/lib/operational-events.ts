import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/types'

export type OperationalSeverity = 'info' | 'warning' | 'critical'

export type OperationalEvent = {
  id: string
  severity: OperationalSeverity
  area: string
  event_type: string
  message: string
  user_id: string | null
  user_email: string | null
  metadata: Json
  resolved_at: string | null
  created_at: string
}

type OperationalEventInput = {
  severity: OperationalSeverity
  area: string
  eventType: string
  message: string
  userId?: string | null
  userEmail?: string | null
  metadata?: Json
}

export async function recordOperationalEvent(
  supabase: SupabaseClient<Database>,
  input: OperationalEventInput
) {
  await supabase
    .from('operational_events')
    .insert({
      severity: input.severity,
      area: input.area,
      event_type: input.eventType,
      message: input.message,
      user_id: input.userId ?? null,
      user_email: input.userEmail ?? null,
      metadata: input.metadata ?? {},
    })
}

export async function safeRecordOperationalEvent(
  supabase: SupabaseClient<Database>,
  input: OperationalEventInput
) {
  try {
    await recordOperationalEvent(supabase, input)
  } catch {
    // Monitoring must never break the user-facing request.
  }
}

export async function listOperationalEvents(
  supabase: SupabaseClient<Database>,
  limit = 20
): Promise<OperationalEvent[]> {
  const { data, error } = await supabase
    .from('operational_events')
    .select('id, severity, area, event_type, message, user_id, user_email, metadata, resolved_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []

  return data ?? []
}
