// src/lib/supabase/client.ts
// Cliente Supabase para Client Components (roda no browser)
// Use este em componentes com 'use client'

import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/config'
import {
  REMEMBER_DEVICE_COOKIE,
  asBrowserSessionCookie,
  shouldPersistAuthSession,
} from '@/lib/supabase/session-cookies'
import type { Database } from '@/lib/supabase/types'

type BrowserCookieOptions = {
  domain?: string
  expires?: Date | string
  maxAge?: number
  path?: string
  sameSite?: 'lax' | 'strict' | 'none' | boolean
  secure?: boolean
}

function getAllCookies() {
  if (typeof document === 'undefined') return []

  return document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .map((cookie) => {
      const separator = cookie.indexOf('=')
      const name = separator >= 0 ? cookie.slice(0, separator) : cookie
      const value = separator >= 0 ? cookie.slice(separator + 1) : ''

      return { name, value }
    })
}

function getCookieValue(name: string): string | undefined {
  return getAllCookies().find((cookie) => cookie.name === name)?.value
}

function setCookie(name: string, value: string, options: BrowserCookieOptions) {
  const persistSession = shouldPersistAuthSession(getCookieValue(REMEMBER_DEVICE_COOKIE))
  const sessionOptions = asBrowserSessionCookie(options, persistSession)
  const parts = [`${name}=${value}`, `Path=${sessionOptions.path ?? '/'}`]

  if (sessionOptions.domain) parts.push(`Domain=${sessionOptions.domain}`)
  if (sessionOptions.maxAge !== undefined) parts.push(`Max-Age=${sessionOptions.maxAge}`)
  if (sessionOptions.expires) {
    const expires = sessionOptions.expires instanceof Date
      ? sessionOptions.expires.toUTCString()
      : sessionOptions.expires
    parts.push(`Expires=${expires}`)
  }
  if (sessionOptions.sameSite && typeof sessionOptions.sameSite === 'string') {
    parts.push(`SameSite=${sessionOptions.sameSite}`)
  }
  if (sessionOptions.secure) parts.push('Secure')

  document.cookie = parts.join('; ')
}

export function createClient() {
  return createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll: getAllCookies,
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            setCookie(name, value, options)
          )
        },
      },
    }
  )
}
