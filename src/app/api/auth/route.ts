import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type AuthAction = 'login' | 'signup' | 'reset' | 'resend_signup'

interface AuthPayload {
  action?: AuthAction
  email?: string
  password?: string
  name?: string
}

function getOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'

  if (forwardedHost) {
    return `${proto}://${forwardedHost}`
  }

  return new URL(request.url).origin
}

export async function POST(request: NextRequest) {
  const payload = await request.json() as AuthPayload
  const action = payload.action
  const email = payload.email?.trim()
  const password = payload.password ?? ''

  if (!action || !email) {
    return NextResponse.json({ error: 'Dados de autenticação incompletos.' }, { status: 400 })
  }

  const supabase = await createClient()

  if (action === 'login') {
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  }

  if (action === 'signup') {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: payload.name?.trim() ?? '' },
        emailRedirectTo: `${getOrigin(request)}/auth/callback`,
      },
    })

    if (error) {
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
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  }

  if (action === 'resend_signup') {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${getOrigin(request)}/auth/callback`,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação de autenticação inválida.' }, { status: 400 })
}
