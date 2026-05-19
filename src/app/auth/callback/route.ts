// src/app/auth/callback/route.ts
// Handler do callback de autenticação OAuth e magic link
// O Supabase redireciona para esta URL após confirmar o email
// ou após login com provedor OAuth (Google, etc.)

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/config'
import {
  LAST_ACTIVITY_COOKIE,
  REMEMBER_DEVICE_COOKIE,
  asBrowserSessionCookie,
  shouldPersistAuthSession,
} from '@/lib/supabase/session-cookies'
import type { Database } from '@/lib/supabase/types'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  // Parâmetros enviados pelo Supabase no redirect
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  // 'next' pode vir do redirectTo que setamos no middleware

  if (code) {
    const cookieStore = await cookies()
    const persistSession = shouldPersistAuthSession(cookieStore.get(REMEMBER_DEVICE_COOKIE)?.value)

    const supabase = createServerClient<Database>(
      getSupabaseUrl(),
      getSupabaseAnonKey(),
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, asBrowserSessionCookie(options, persistSession))
              )
            } catch { /* Route Handler pode setar cookies normalmente */ }
          },
        },
      }
    )

    // Troca o código PKCE pela sessão autenticada
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      if (!persistSession) {
        cookieStore.set(LAST_ACTIVITY_COOKIE, Date.now().toString(), {
          path: '/',
          sameSite: 'lax',
        })
      }

      // Verifica se o usuário já tem perfil/onboarding completo
      // Tipo explícito necessário para o TypeScript inferir onboarding_done
      const { data: userData } = await supabase
        .from('users')
        .select('onboarding_done')
        .eq('id', data.user.id)
        .single<{ onboarding_done: boolean }>()

      // Redireciona para onboarding se ainda não completou
      if (
        userData &&
        !userData.onboarding_done &&
        !next.startsWith('/profile/reset-password') &&
        !next.startsWith('/pro/accept')
      ) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      // Redireciona para a página destino original ou dashboard
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        // Em desenvolvimento, usa a origin diretamente
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        // Em produção com proxy (Vercel), usa o host real
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Código inválido ou ausente → redireciona para login com erro
  return NextResponse.redirect(
    `${origin}/login?error=auth_callback_error`
  )
}
