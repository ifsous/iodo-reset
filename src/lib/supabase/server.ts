// src/lib/supabase/server.ts
// Cliente Supabase para Server Components, Server Actions e Route Handlers
// NUNCA importe este arquivo em Client Components ('use client')

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'

export async function createClient() {
  // cookies() deve ser chamado antes de qualquer chamada ao Supabase
  // para garantir que os dados não sejam cacheados pelo Next.js
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components não podem setar cookies diretamente.
            // O middleware abaixo (middleware.ts) garante que os tokens
            // renovados sejam salvos corretamente.
          }
        },
      },
    }
  )
}

// Cliente com service_role — bypassa RLS completamente
// Use APENAS em rotas de API protegidas no servidor (ex: /api/analyze)
// NUNCA exponha no frontend
export async function createServiceClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* Server Component — middleware cobre */ }
        },
      },
    }
  )
}
