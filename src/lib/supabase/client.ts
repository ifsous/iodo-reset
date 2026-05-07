// src/lib/supabase/client.ts
// Cliente Supabase para Client Components (roda no browser)
// Use este em componentes com 'use client'

import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/config'
import type { Database } from '@/lib/supabase/types'

export function createClient() {
  return createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey()
  )
}
