'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProfessionalInvite {
  id: string
  displayName: string
  credential: string | null
  specialty: string | null
  status: string
}

export default function AcceptInviteView({
  professional,
  error,
}: {
  professional: ProfessionalInvite | null
  error?: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(error ?? null)

  async function accept() {
    if (!professional) return
    setSaving(true)
    setLocalError(null)
    setMessage(null)

    const response = await fetch('/api/pro/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ professional_id: professional.id }),
    })

    const result = await response.json() as { error?: string }
    setSaving(false)

    if (!response.ok) {
      setLocalError(result.error ?? 'Erro ao aceitar convite.')
      return
    }

    setMessage('Convite aceito. Seu profissional ja pode acompanhar seu protocolo.')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#F7FAF9] pb-8">
      <div className="bg-teal-800 pt-12 pb-6 px-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-white text-2xl font-semibold">Aceitar convite</h1>
          <p className="text-teal-100/80 text-sm mt-1">Vinculo profissional-paciente</p>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <section className="bg-white rounded-lg border border-gray-200/70 p-5 shadow-sm">
          {professional ? (
            <>
              <div className="w-14 h-14 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center font-semibold mb-4">
                {professional.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')}
              </div>
              <p className="text-sm text-gray-500">Profissional convidante</p>
              <h2 className="text-xl font-semibold text-gray-950 mt-1">{professional.displayName}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {[professional.credential, professional.specialty].filter(Boolean).join(' - ') || 'IODO RESET Pro'}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed mt-4">
                Ao aceitar, este profissional podera visualizar seu protocolo, registros diarios, exames e adicionar notas profissionais.
              </p>

              {message && (
                <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-3 mt-4">{message}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-600">Nao foi possivel carregar este convite.</p>
          )}

          {localError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3 mt-4">{localError}</p>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all"
            >
              Agora nao
            </button>
            <button
              onClick={accept}
              disabled={!professional || saving || professional?.status === 'active'}
              className="flex-1 py-2.5 rounded-lg bg-teal-800 hover:bg-teal-900 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
            >
              {professional?.status === 'active' ? 'Ja aceito' : saving ? 'Aceitando...' : 'Aceitar'}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
