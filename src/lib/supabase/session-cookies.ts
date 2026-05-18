type SupabaseCookieOptions = {
  maxAge?: number
  expires?: unknown
  [key: string]: unknown
}

export function asBrowserSessionCookie<T extends SupabaseCookieOptions>(options: T): T {
  if (options.maxAge === 0) return options

  const sessionOptions = { ...options }
  delete sessionOptions.maxAge
  delete sessionOptions.expires

  return sessionOptions
}
