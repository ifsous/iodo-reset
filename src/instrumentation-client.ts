import * as Sentry from '@sentry/nextjs'
import { scrubSentryEvent } from './sentry.shared'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.05,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
