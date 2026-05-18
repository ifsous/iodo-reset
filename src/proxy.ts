// src/middleware.ts
// Responsabilidades:
//   1. Renovar o token de Auth antes que expire (obrigatório com @supabase/ssr)
//   2. Proteger rotas autenticadas — redireciona para /login se não logado
//   3. Redirecionar usuários logados para fora das páginas de auth

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/config'
import { asBrowserSessionCookie } from '@/lib/supabase/session-cookies'
import type { Database } from '@/lib/supabase/types'

// Rotas que exigem login
const PROTECTED_ROUTES = [
  '/dashboard',
  '/diary',
  '/onboarding',
  '/exams',
  '/admin',
  '/protocol',
  '/profile',
  '/pro',           // painel profissional
]

// Rotas de autenticação — redireciona para /dashboard se já logado
const AUTH_ROUTES = ['/login', '/signup']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Primeiro: atualiza os cookies na request (para Server Components lerem)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Segundo: cria uma nova response com os cookies atualizados
          supabaseResponse = NextResponse.next({ request })
          // Terceiro: replica os cookies na response (para o browser salvar)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, asBrowserSessionCookie(options))
          )
        },
      },
    }
  )

  // IMPORTANTE: usar getUser(), nunca getSession() no middleware.
  // getUser() valida o token com o servidor Supabase a cada chamada.
  // getSession() só lê o cookie local e pode estar desatualizado.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Usuário NÃO logado tentando acessar rota protegida → /login
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  )
  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.search = ''
    redirectUrl.searchParams.set('redirectTo', `${pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(redirectUrl)
  }

  // Usuário LOGADO tentando acessar página de auth → /dashboard
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))
  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  // Usuário LOGADO sem onboarding tentando acessar qualquer rota protegida
  // (exceto o próprio onboarding) → /onboarding
  if (user && isProtected && !pathname.startsWith('/onboarding') && !pathname.startsWith('/pro/accept')) {
    // Busca se o usuário já completou o onboarding
    const { data: userData } = await supabase
      .from('users')
      .select('onboarding_done')
      .eq('id', user.id)
      .single<{ onboarding_done: boolean }>()

    if (userData && !userData.onboarding_done) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/onboarding'
      return NextResponse.redirect(redirectUrl)
    }
  }

  // IMPORTANTE: sempre retornar supabaseResponse (não NextResponse.next())
  // para garantir que os cookies renovados sejam propagados
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware em todas as rotas EXCETO:
     * - Arquivos estáticos (_next/static, _next/image)
     * - favicon.ico
     * - Imagens e assets públicos
     * - API routes do Stripe webhook (precisam do body raw, sem cookie parsing)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
