'use client'

import { useState } from 'react'

export default function ErrorSupportPanel({
  error,
  onRetry,
}: {
  error: Error & { digest?: string }
  onRetry: () => void
}) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  async function reportError() {
    setLoading(true)
    setFailure(null)

    const response = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'app_error',
        severity: 'critical',
        title: 'Erro no app',
        message: message.trim() || 'Usuario reportou um erro exibido pela tela de erro.',
        pageUrl: `${window.location.pathname}${window.location.search}`,
        userAgent: navigator.userAgent,
        errorDigest: error.digest ?? null,
        metadata: {
          error_message: error.message,
        },
      }),
    })
    const result = await response.json().catch(() => ({})) as { error?: string }

    if (!response.ok) {
      setFailure(result.error ?? 'Nao foi possivel enviar o erro ao suporte.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F7FAF9] px-4 py-12">
      <div className="mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-700">
            !
          </div>
          <h1 className="text-xl font-semibold text-gray-950">Algo deu errado</h1>
          <p className="mt-2 text-sm text-gray-600">
            Voce pode tentar novamente ou enviar este erro para o suporte.
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-gray-400">Codigo tecnico: {error.digest}</p>
          )}
        </div>

        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          maxLength={1200}
          placeholder="Opcional: descreva o que estava fazendo antes do erro."
          className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />

        {failure && (
          <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3">
            <p className="text-sm text-red-700">{failure}</p>
          </div>
        )}
        {sent && (
          <div className="mt-3 rounded-lg border border-teal-100 bg-teal-50 p-3">
            <p className="text-sm text-teal-800">Erro enviado ao suporte.</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Tentar novamente
          </button>
          <button
            type="button"
            onClick={() => void reportError()}
            disabled={loading || sent}
            className="rounded-lg bg-teal-800 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Enviando...' : sent ? 'Enviado' : 'Enviar erro'}
          </button>
        </div>
      </div>
    </div>
  )
}
