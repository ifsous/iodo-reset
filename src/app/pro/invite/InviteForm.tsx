'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { InvitePageData } from './page'

export default function InviteForm({ data }: { data: InvitePageData }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{
    email: string
    acceptUrl: string
    emailDelivery?: { status: 'sent' | 'skipped' | 'failed'; reason?: string }
  } | null>(null)
  const [copied, setCopied] = useState(false)

  async function submit() {
    setSaving(true)
    setError(null)
    setSuccess(null)
    setCopied(false)

    const response = await fetch('/api/pro/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pro_notes: notes }),
    })

    const result = await response.json() as {
      error?: string
      accept_path?: string
      email_delivery?: { status: 'sent' | 'skipped' | 'failed'; reason?: string }
      patient?: { email: string }
    }

    setSaving(false)

    if (!response.ok) {
      setError(result.error ?? 'Erro ao enviar convite.')
      return
    }

    setEmail('')
    setNotes('')
    const acceptPath = result.accept_path ?? `/pro/accept?professional_id=${data.professionalId}`
    setSuccess({
      email: result.patient?.email ?? email,
      acceptUrl: new URL(acceptPath, window.location.origin).toString(),
      emailDelivery: result.email_delivery,
    })
    router.refresh()
  }

  async function copyAcceptLink() {
    if (!success) return

    await navigator.clipboard.writeText(success.acceptUrl)
    setCopied(true)
  }

  const remaining = Math.max(0, data.patientLimit - data.linkedCount)

  return (
    <div className="min-h-screen bg-[#F7FAF9] pb-8">
      <div className="bg-teal-800 pt-12 pb-6 px-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.push('/pro')}
            className="text-teal-100/80 hover:text-white text-xs flex items-center gap-1 mb-3 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L5 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Painel Pro
          </button>
          <h1 className="text-white text-2xl font-semibold">Convidar paciente</h1>
          <p className="text-teal-100/80 text-sm mt-1">{data.displayName}</p>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <section className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Novo vinculo</p>
              <p className="text-xs text-gray-500 mt-1">{remaining} vagas disponiveis</p>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-100">
              {data.linkedCount}/{data.patientLimit}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email do paciente</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="paciente@email.com"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nota inicial</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder="Contexto clinico, combinados ou observacoes iniciais"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3 mt-3">{error}</p>
          )}

          {success && (
            <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-3 mt-3">
              <p className="font-medium">Convite criado para {success.email}.</p>
              {success.emailDelivery?.status === 'sent' ? (
                <p className="text-xs mt-1">E-mail enviado automaticamente ao paciente.</p>
              ) : success.emailDelivery?.status === 'failed' ? (
                <p className="text-xs mt-1">Nao foi possivel enviar o e-mail automatico. Copie o link abaixo e envie manualmente.</p>
              ) : (
                <p className="text-xs mt-1">Envio automatico pendente de configuracao. Copie o link abaixo e envie manualmente.</p>
              )}
              <p className="text-xs mt-1 break-all">Link de aceite: {success.acceptUrl}</p>
              <button
                type="button"
                onClick={() => void copyAcceptLink()}
                className="mt-2 text-xs font-medium text-emerald-900 underline-offset-2 hover:underline"
              >
                {copied ? 'Link copiado' : 'Copiar link'}
              </button>
            </div>
          )}

          <button
            onClick={submit}
            disabled={saving || remaining <= 0}
            className="w-full mt-4 py-3 rounded-lg bg-teal-800 hover:bg-teal-900 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
          >
            {saving ? 'Enviando...' : 'Criar convite'}
          </button>
        </section>

        <section className="bg-amber-50 border border-amber-100 rounded-lg p-3">
          <p className="text-xs text-amber-800 leading-relaxed">
            Nesta etapa o paciente precisa ja ter uma conta no app. Com e-mail transacional configurado, o convite e enviado automaticamente; o link continua disponivel como alternativa manual.
          </p>
        </section>
      </main>
    </div>
  )
}
