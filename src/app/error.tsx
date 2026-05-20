'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import ErrorSupportPanel from '@/components/ErrorSupportPanel'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return <ErrorSupportPanel error={error} onRetry={unstable_retry} />
}
