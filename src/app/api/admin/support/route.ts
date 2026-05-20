import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminEmail } from '@/lib/adminAuth'
import { listSupportFeedback } from '@/lib/support-feedback'
import type { SupportFeedbackStatus } from '@/lib/supabase/types'

const VALID_STATUSES = new Set<SupportFeedbackStatus>([
  'new',
  'in_review',
  'resolved',
  'closed',
])

type AdminActor = {
  id: string
  email: string
}

type SupportPatch = {
  feedback_id?: string
  status?: SupportFeedbackStatus
  admin_notes?: string
}

async function requireAdmin(): Promise<{ actor: AdminActor | null; response: NextResponse | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return {
      actor: null,
      response: NextResponse.json({ error: 'Acesso admin necessario.' }, { status: 403 }),
    }
  }

  return {
    actor: {
      id: user.id,
      email: user.email,
    },
    response: null,
  }
}

export async function GET() {
  const { response } = await requireAdmin()
  if (response) return response

  return NextResponse.json({
    feedback: await listSupportFeedback(createAdminClient()),
  })
}

export async function PATCH(request: NextRequest) {
  const { actor, response } = await requireAdmin()
  if (response) return response
  if (!actor) return NextResponse.json({ error: 'Acesso admin necessario.' }, { status: 403 })

  const payload = await request.json().catch(() => ({})) as SupportPatch

  if (!payload.feedback_id) {
    return NextResponse.json({ error: 'feedback_id e obrigatorio.' }, { status: 400 })
  }

  if (payload.status && !VALID_STATUSES.has(payload.status)) {
    return NextResponse.json({ error: 'Status invalido.' }, { status: 400 })
  }

  const update: {
    status?: SupportFeedbackStatus
    admin_notes?: string | null
    resolved_at?: string | null
    updated_at: string
  } = {
    updated_at: new Date().toISOString(),
  }

  if (payload.status) {
    update.status = payload.status
    update.resolved_at = payload.status === 'resolved' || payload.status === 'closed'
      ? new Date().toISOString()
      : null
  }

  if (payload.admin_notes !== undefined) {
    update.admin_notes = payload.admin_notes.trim().slice(0, 1000) || null
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('support_feedback')
    .update(update)
    .eq('id', payload.feedback_id)
    .select('id, user_id, user_email, category, severity, status, title, message, page_url, user_agent, sentry_event_id, error_digest, metadata, admin_notes, resolved_at, created_at, updated_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Feedback nao encontrado.' }, { status: 404 })
  }

  revalidatePath('/admin')

  return NextResponse.json({
    feedback: data,
    feedbackList: await listSupportFeedback(supabase),
  })
}
