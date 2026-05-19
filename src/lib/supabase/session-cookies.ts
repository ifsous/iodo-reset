type SupabaseCookieOptions = {
  maxAge?: number
  expires?: unknown
  [key: string]: unknown
}

export const REMEMBER_DEVICE_COOKIE = 'iodo_remember_device'
export const LAST_ACTIVITY_COOKIE = 'iodo_last_activity'
export const REMEMBER_DEVICE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000

export function shouldPersistAuthSession(value: unknown): boolean {
  return value === '1'
}

export function asBrowserSessionCookie<T extends SupabaseCookieOptions>(
  options: T,
  persistSession = false
): T {
  if (persistSession || options.maxAge === 0) return options

  const sessionOptions = { ...options }
  delete sessionOptions.maxAge
  delete sessionOptions.expires

  return sessionOptions
}
