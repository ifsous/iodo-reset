import type { ErrorEvent } from '@sentry/nextjs'

const SENSITIVE_KEYS = [
  'analysis',
  'analysis_text',
  'birth_year',
  'conditions',
  'current_symptoms',
  'exam',
  'exams',
  'medications',
  'notes',
  'password',
  'profile',
  'protocol',
  'symptoms',
  'token',
]

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEYS.some((sensitiveKey) => key.toLowerCase().includes(sensitiveKey))
        ? '[Filtered]'
        : redact(entry),
    ])
  )
}

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  if (event.user) {
    event.user = {
      id: event.user.id,
    }
  }

  if (event.request) {
    delete event.request.cookies
    delete event.request.data
    delete event.request.headers
    delete event.request.query_string
  }

  if (event.extra) {
    event.extra = redact(event.extra) as ErrorEvent['extra']
  }

  if (event.contexts) {
    event.contexts = redact(event.contexts) as ErrorEvent['contexts']
  }

  return event
}
