// src/lib/supabase/server.ts
// Cliente Supabase para Server Components, Server Actions e Route Handlers
// NUNCA importe este arquivo em Client Components ('use client')

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from '@/lib/supabase/config'
import {
  REMEMBER_DEVICE_COOKIE,
  asBrowserSessionCookie,
  shouldPersistAuthSession,
} from '@/lib/supabase/session-cookies'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

type TypedSupabaseClient = SupabaseClient<Database>

export async function createClient(): Promise<TypedSupabaseClient> {
  // cookies() deve ser chamado antes de qualquer chamada ao Supabase
  // para garantir que os dados não sejam cacheados pelo Next.js
  const cookieStore = await cookies()
  const persistSession = shouldPersistAuthSession(cookieStore.get(REMEMBER_DEVICE_COOKIE)?.value)

  return createServerClient<Database>(
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
export async function createServiceClient(): Promise<TypedSupabaseClient> {
  const cookieStore = await cookies()
  const persistSession = shouldPersistAuthSession(cookieStore.get(REMEMBER_DEVICE_COOKIE)?.value)

  return createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
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
          } catch { /* Server Component — middleware cobre */ }
        },
      },
    }
  )
}
