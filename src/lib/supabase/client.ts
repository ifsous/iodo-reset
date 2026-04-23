// src/lib/supabase/client.ts
// Cliente Supabase para Client Components (roda no browser)
// Use este em componentes com 'use client'

import { createBrowserClient } from '@supabase/ssr'

// @ts-expect-error - Supabase generic types issue with @supabase/ssr
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
