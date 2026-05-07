function cleanEnvValue(value: string | undefined): string {
  const trimmed = value?.trim() ?? ''

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }

  return trimmed
}

export function getSupabaseUrl(): string {
  const rawUrl = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL)

  if (!rawUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }

  const url = new URL(rawUrl)
  return url.origin
}

export function getSupabaseAnonKey(): string {
  const key = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  if (!key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured')
  }

  return key
}

export function getSupabaseServiceRoleKey(): string {
  const key = cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  return key
}
