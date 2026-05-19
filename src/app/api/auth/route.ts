import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { safeRecordOperationalEvent } from '@/lib/operational-events'
import {
  LAST_ACTIVITY_COOKIE,
  REMEMBER_DEVICE_COOKIE,
  REMEMBER_DEVICE_MAX_AGE_SECONDS,
} from '@/lib/supabase/session-cookies'

type AuthAction = 'login' | 'signup' | 'reset' | 'resend_signup'

interface AuthPayload {
  action?: AuthAction
  email?: string
  password?: string
  name?: string
  redirectTo?: string
  rememberDevice?: boolean
}

function getOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'

  if (forwardedHost) {
    return `${proto}://${forwardedHost}`
  }

  return new URL(request.url).origin
}

function safeRedirectPath(value: unknown): string {
  if (typeof value !== 'string') return '/dashboard'
  const trimmed = value.trim()

  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/dashboard'

  return trimmed
}

async function recordAuthIssue(input: {
  action: AuthAction
  email: string
  error: string
  severity?: 'warning' | 'critical'
}) {
  await safeRecordOperationalEvent(createAdminClient(), {
    severity: input.severity ?? 'warning',
    area: 'auth',
    eventType: `${input.action}_failed`,
    message: `Falha em ${input.action}: ${input.error}`,
    userEmail: input.email,
    metadata: {
      action: input.action,
      error: input.error,
    },
  })
}

export async function POST(request: NextRequest) {
  const payload = await request.json() as AuthPayload
  const action = payload.action
  const email = payload.email?.trim()
  const password = payload.password ?? ''

  if (!action || !email) {
    return NextResponse.json({ error: 'Dados de autenticação incompletos.' }, { status: 400 })
  }

  const cookieStore = await cookies()

  if (action === 'login') {
    if (payload.rememberDevice) {
      cookieStore.set(REMEMBER_DEVICE_COOKIE, '1', {
        path: '/',
        sameSite: 'lax',
        maxAge: REMEMBER_DEVICE_MAX_AGE_SECONDS,
      })
    } else {
      cookieStore.set(REMEMBER_DEVICE_COOKIE, '', {
        path: '/',
        sameSite: 'lax',
        maxAge: 0,
      })
    }
  }

  const supabase = await createClient()

  if (action === 'login') {
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      cookieStore.set(REMEMBER_DEVICE_COOKIE, '', {
        path: '/',
        sameSite: 'lax',
        maxAge: 0,
      })
      cookieStore.set(LAST_ACTIVITY_COOKIE, '', {
        path: '/',
        sameSite: 'lax',
        maxAge: 0,
      })
      await recordAuthIssue({ action, email, error: error.message })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!payload.rememberDevice) {
      cookieStore.set(LAST_ACTIVITY_COOKIE, Date.now().toString(), {
        path: '/',
        sameSite: 'lax',
      })
    } else {
      cookieStore.set(LAST_ACTIVITY_COOKIE, '', {
        path: '/',
        sameSite: 'lax',
        maxAge: 0,
      })
    }

    return NextResponse.json({ ok: true })
  }

  if (action === 'signup') {
    const next = encodeURIComponent(safeRedirectPath(payload.redirectTo))
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: payload.name?.trim() ?? '' },
        emailRedirectTo: `${getOrigin(request)}/auth/callback?next=${next}`,
      },
    })

    if (error) {
      await recordAuthIssue({ action, email, error: error.message })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  }

  if (action === 'reset') {
    const next = encodeURIComponent('/profile/reset-password?mode=recovery')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getOrigin(request)}/auth/callback?next=${next}`,
    })

    if (error) {
      await recordAuthIssue({ action, email, error: error.message })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  }

  if (action === 'resend_signup') {
    const next = encodeURIComponent(safeRedirectPath(payload.redirectTo))
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${getOrigin(request)}/auth/callback?next=${next}`,
      },
    })

    if (error) {
      await recordAuthIssue({ action, email, error: error.message, severity: 'critical' })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação de autenticação inválida.' }, { status: 400 })
}
