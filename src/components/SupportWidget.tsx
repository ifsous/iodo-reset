'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

type Category = 'suggestion' | 'criticism' | 'support' | 'bug'

const CATEGORY_LABELS: Record<Category, string> = {
  suggestion: 'Sugestao',
  criticism: 'Critica',
  support: 'Suporte',
  bug: 'Problema',
}

export default function SupportWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<Category>('suggestion')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const response = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category,
        severity: category === 'bug' ? 'high' : 'normal',
        title,
        message,
        pageUrl: `${pathname}${window.location.search}`,
        userAgent: navigator.userAgent,
      }),
    })
    const result = await response.json().catch(() => ({})) as { error?: string }

    if (!response.ok) {
      setError(result.error ?? 'Nao foi possivel enviar agora.')
      setLoading(false)
      return
    }

    setTitle('')
    setMessage('')
    setSuccess('Recebemos sua mensagem. Obrigado por ajudar a melhorar o app.')
    setLoading(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          setError(null)
          setSuccess(null)
        }}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-teal-800 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      >
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/45 px-4 py-4 sm:items-center">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-4">
              <div>
                <h2 className="text-base font-semibold text-gray-950">Enviar ao suporte</h2>
                <p className="mt-1 text-sm text-gray-500">Sugestoes, criticas e problemas do app.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(CATEGORY_LABELS) as Category[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      category === item
                        ? 'border-teal-800 bg-teal-50 text-teal-900'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {CATEGORY_LABELS[item]}
                  </button>
                ))}
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Titulo</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={120}
                  required
                  placeholder="Resumo rapido"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Mensagem</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={2000}
                  required
                  rows={5}
                  placeholder="Conte o que aconteceu ou o que poderia melhorar."
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </label>

              {error && (
                <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              {success && (
                <div className="rounded-lg border border-teal-100 bg-teal-50 p-3">
                  <p className="text-sm text-teal-800">{success}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-teal-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
