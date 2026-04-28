// src/lib/supabase/env.ts

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.')
  }

  if (url.includes('/rest/v1')) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL must be the project base URL (https://<project-ref>.supabase.co) and must not include /rest/v1.'
    )
  }

  return url
}
