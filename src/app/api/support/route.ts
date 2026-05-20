import { NextResponse, type NextRequest } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSupportFeedback } from '@/lib/support-feedback'
import type {
  Json,
  SupportFeedbackCategory,
  SupportFeedbackSeverity,
} from '@/lib/supabase/types'

const VALID_CATEGORIES = new Set<SupportFeedbackCategory>([
  'suggestion',
  'criticism',
  'support',
  'bug',
  'app_error',
])

const VALID_SEVERITIES = new Set<SupportFeedbackSeverity>([
  'low',
  'normal',
  'high',
  'critical',
])

type SupportPayload = {
  category?: string
  severity?: string
  title?: string
  message?: string
  pageUrl?: string
  userAgent?: string
  sentryEventId?: string
  errorDigest?: string
  metadata?: Json
}

function cleanText(value: unknown, limit: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, limit)
}

function cleanMultiline(value: unknown, limit: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, limit)
}

function cleanUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().slice(0, 500)

  if (!trimmed.startsWith('/')) {
    try {
      const url = new URL(trimmed)
      return `${url.pathname}${url.search}${url.hash}`.slice(0, 500)
    } catch {
      return null
    }
  }

  return trimmed
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({})) as SupportPayload
  const category = VALID_CATEGORIES.has(payload.category as SupportFeedbackCategory)
    ? payload.category as SupportFeedbackCategory
    : null
  const severity = VALID_SEVERITIES.has(payload.severity as SupportFeedbackSeverity)
    ? payload.severity as SupportFeedbackSeverity
    : 'normal'
  const title = cleanText(payload.title, 120)
  const message = cleanMultiline(payload.message, 2000)

  if (!category) {
    return NextResponse.json({ error: 'Tipo de feedback invalido.' }, { status: 400 })
  }

  if (!title || !message) {
    return NextResponse.json({ error: 'Titulo e mensagem sao obrigatorios.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Entre na conta para enviar ao suporte.' }, { status: 401 })
  }

  const sentryEventId = cleanText(payload.sentryEventId, 80) || null
  const metadata: Json = {
    ...(typeof payload.metadata === 'object' && payload.metadata !== null ? payload.metadata : {}),
    source: 'in_app_support',
  }

  const result = await createSupportFeedback(createAdminClient(), {
    userId: user.id,
    userEmail: user.email ?? null,
    category,
    severity,
    title,
    message,
    pageUrl: cleanUrl(payload.pageUrl),
    userAgent: cleanText(payload.userAgent, 300) || request.headers.get('user-agent')?.slice(0, 300) || null,
    sentryEventId,
    errorDigest: cleanText(payload.errorDigest, 120) || null,
    metadata,
  })

  if (result.error || !result.data) {
    Sentry.captureMessage('support_feedback_insert_failed', {
      level: 'warning',
      tags: { area: 'support' },
      extra: { error: result.error },
    })

    return NextResponse.json({ error: 'Erro ao enviar feedback.' }, { status: 500 })
  }

  if (category === 'bug' || category === 'app_error') {
    Sentry.captureMessage(title, {
      level: severity === 'critical' ? 'error' : 'warning',
      tags: {
        area: 'support',
        category,
        feedback_id: result.data.id,
      },
      extra: {
        feedback_id: result.data.id,
        page_url: result.data.page_url,
        sentry_event_id: sentryEventId,
      },
    })
  }

  return NextResponse.json({ feedback: result.data })
}
