'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PlanType } from '@/lib/supabase/types'

type AdminUser = {
  id: string
  email: string
  full_name: string | null
  plan: PlanType
  is_professional: boolean
  onboarding_done: boolean
  plan_started_at: string | null
  plan_expires_at: string | null
  created_at: string
  updated_at: string
}

type Patch = {
  plan?: PlanType
  is_professional?: boolean
  onboarding_done?: boolean
}

const PLAN_LABELS: Record<PlanType, string> = {
  free: 'Free',
  pro: 'Pro',
  clinic: 'Clinica',
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function planClass(plan: PlanType): string {
  if (plan === 'clinic') return 'bg-indigo-50 text-indigo-800 border-indigo-100'
  if (plan === 'pro') return 'bg-teal-50 text-teal-800 border-teal-100'
  return 'bg-gray-50 text-gray-600 border-gray-100'
}

function Toggle({ active, label, onClick, disabled }: {
  active: boolean
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors disabled:opacity-60 ${
        active
          ? 'bg-teal-800 text-white border-teal-800'
          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  )
}

export default function AdminView({ adminEmail, initialUsers }: { adminEmail: string; initialUsers: AdminUser[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<AdminUser[]>(initialUsers)
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadUsers(search = query) {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())

    const response = await fetch(`/api/admin/users?${params.toString()}`)
    const result = await response.json() as { users?: AdminUser[]; error?: string }

    if (!response.ok) {
      setError(result.error ?? 'Erro ao buscar usuarios.')
      setLoading(false)
      return
    }

    setUsers(result.users ?? [])
    setLoading(false)
  }

  async function updateUser(userId: string, patch: Patch) {
    setSavingId(userId)
    setError(null)

    const response = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...patch }),
    })
    const result = await response.json() as { user?: AdminUser; error?: string }

    if (!response.ok || !result.user) {
      setError(result.error ?? 'Erro ao atualizar usuario.')
      setSavingId(null)
      return
    }

    setUsers((current) => current.map((user) => user.id === userId ? result.user! : user))
    setSavingId(null)
  }

  return (
    <div className="min-h-screen bg-[#F7FAF9] pb-10">
      <header className="bg-gray-950 pt-12 pb-6 px-4">
        <div className="max-w-5xl mx-auto">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-1 text-sm text-gray-300 mb-4"
          >
            <span aria-hidden="true">‹</span>
            Dashboard
          </button>
          <p className="text-gray-400 text-sm">Portal administrativo</p>
          <h1 className="text-white text-2xl font-semibold mt-1">Controle de acessos MVP</h1>
          <p className="text-gray-400 text-sm mt-2">Admin conectado: {adminEmail}</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-4 space-y-4">
        <section className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm">
          <form
            className="flex flex-col sm:flex-row gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              void loadUsers(query)
            }}
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por email ou nome"
              className="flex-1 rounded-lg border border-gray-200 bg-white text-gray-950 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-teal-800 text-white text-sm font-medium px-5 py-3 hover:bg-teal-900 transition-colors"
            >
              Buscar
            </button>
          </form>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <section className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-lg border border-gray-200/70 p-8 text-center">
              <p className="text-sm text-gray-500">Carregando usuarios...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200/70 p-8 text-center">
              <p className="text-sm text-gray-500">Nenhum usuario encontrado.</p>
            </div>
          ) : (
            users.map((user) => {
              const saving = savingId === user.id
              return (
                <article key={user.id} className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold text-gray-950">{user.full_name || 'Sem nome'}</h2>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${planClass(user.plan)}`}>
                          {PLAN_LABELS[user.plan]}
                        </span>
                        {user.is_professional && (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-100">
                            Professional
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 break-all">{user.email}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-400">
                        <span>Cadastro: {formatDate(user.created_at)}</span>
                        <span>Onboarding: {user.onboarding_done ? 'sim' : 'nao'}</span>
                        <span>Plano desde: {formatDate(user.plan_started_at)}</span>
                      </div>
                    </div>

                    <div className="space-y-3 lg:min-w-[360px]">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Plano</p>
                        <div className="flex flex-wrap gap-2">
                          {(['free', 'pro', 'clinic'] as PlanType[]).map((plan) => (
                            <Toggle
                              key={plan}
                              label={PLAN_LABELS[plan]}
                              active={user.plan === plan}
                              disabled={saving}
                              onClick={() => void updateUser(user.id, plan === 'clinic' ? { plan, is_professional: true } : { plan })}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Permissoes</p>
                        <div className="flex flex-wrap gap-2">
                          <Toggle
                            label="Professional"
                            active={user.is_professional}
                            disabled={saving}
                            onClick={() => void updateUser(user.id, { is_professional: !user.is_professional })}
                          />
                          <Toggle
                            label="Onboarding concluido"
                            active={user.onboarding_done}
                            disabled={saving}
                            onClick={() => void updateUser(user.id, { onboarding_done: !user.onboarding_done })}
                          />
                        </div>
                      </div>

                      {saving && <p className="text-xs text-gray-400">Salvando...</p>}
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </section>

        <p className="text-xs text-gray-400 text-center">
          O acesso admin e controlado por ADMIN_EMAILS no ambiente da aplicacao.
        </p>
      </main>
    </div>
  )
}
