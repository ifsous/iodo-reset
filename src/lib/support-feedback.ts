import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  Json,
  SupportFeedbackCategory,
  SupportFeedbackSeverity,
  SupportFeedbackStatus,
} from '@/lib/supabase/types'

export type SupportFeedback = {
  id: string
  user_id: string | null
  user_email: string | null
  category: SupportFeedbackCategory
  severity: SupportFeedbackSeverity
  status: SupportFeedbackStatus
  title: string
  message: string
  page_url: string | null
  user_agent: string | null
  sentry_event_id: string | null
  error_digest: string | null
  metadata: Json
  admin_notes: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export type SupportFeedbackInput = {
  userId?: string | null
  userEmail?: string | null
  category: SupportFeedbackCategory
  severity?: SupportFeedbackSeverity
  title: string
  message: string
  pageUrl?: string | null
  userAgent?: string | null
  sentryEventId?: string | null
  errorDigest?: string | null
  metadata?: Json
}

export async function createSupportFeedback(
  supabase: SupabaseClient<Database>,
  input: SupportFeedbackInput
): Promise<{ data: SupportFeedback | null; error: string | null }> {
  const { data, error } = await supabase
    .from('support_feedback')
    .insert({
      user_id: input.userId ?? null,
      user_email: input.userEmail ?? null,
      category: input.category,
      severity: input.severity ?? 'normal',
      title: input.title,
      message: input.message,
      page_url: input.pageUrl ?? null,
      user_agent: input.userAgent ?? null,
      sentry_event_id: input.sentryEventId ?? null,
      error_digest: input.errorDigest ?? null,
      metadata: input.metadata ?? {},
    })
    .select('id, user_id, user_email, category, severity, status, title, message, page_url, user_agent, sentry_event_id, error_digest, metadata, admin_notes, resolved_at, created_at, updated_at')
    .single<SupportFeedback>()

  if (error) return { data: null, error: error.message }

  return { data, error: null }
}

export async function listSupportFeedback(
  supabase: SupabaseClient<Database>,
  limit = 50
): Promise<SupportFeedback[]> {
  const { data, error } = await supabase
    .from('support_feedback')
    .select('id, user_id, user_email, category, severity, status, title, message, page_url, user_agent, sentry_event_id, error_digest, metadata, admin_notes, resolved_at, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []

  return data ?? []
}
