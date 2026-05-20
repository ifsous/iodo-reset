'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import ErrorSupportPanel from '@/components/ErrorSupportPanel'
import './globals.css'

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body>
        <ErrorSupportPanel error={error} onRetry={unstable_retry} />
      </body>
    </html>
  )
}
