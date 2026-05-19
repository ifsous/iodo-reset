import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/types'

export type AdminAuditLog = {
  id: string
  actor_user_id: string | null
  actor_email: string
  action: string
  target_user_id: string | null
  target_email: string | null
  summary: string | null
  before_state: Json | null
  after_state: Json | null
  metadata: Json
  created_at: string
}

type AdminActor = {
  id: string
  email: string
}

type AuditInput = {
  actor: AdminActor
  action: string
  targetUserId?: string | null
  targetEmail?: string | null
  summary?: string | null
  beforeState?: Json | null
  afterState?: Json | null
  metadata?: Json
}

export async function recordAdminAuditLog(
  supabase: SupabaseClient<Database>,
  input: AuditInput
) {
  await supabase
    .from('admin_audit_logs')
    .insert({
      actor_user_id: input.actor.id,
      actor_email: input.actor.email,
      action: input.action,
      target_user_id: input.targetUserId ?? null,
      target_email: input.targetEmail ?? null,
      summary: input.summary ?? null,
      before_state: input.beforeState ?? null,
      after_state: input.afterState ?? null,
      metadata: input.metadata ?? {},
    })
}

export async function listAdminAuditLogs(
  supabase: SupabaseClient<Database>,
  limit = 20
): Promise<AdminAuditLog[]> {
  const { data } = await supabase
    .from('admin_audit_logs')
    .select('id, actor_user_id, actor_email, action, target_user_id, target_email, summary, before_state, after_state, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  return data ?? []
}
