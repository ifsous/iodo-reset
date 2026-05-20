'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PlanType } from '@/lib/supabase/types'
import type { AdminAuditLog } from '@/lib/admin-audit'
import type { OperationalEvent } from '@/lib/operational-events'
import type { SupportFeedback } from '@/lib/support-feedback'
import type { AdminUser } from '@/lib/admin-users'

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

function formatDateTime(value: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function planClass(plan: PlanType): string {
  if (plan === 'clinic') return 'bg-indigo-50 text-indigo-800 border-indigo-100'
  if (plan === 'pro') return 'bg-teal-50 text-teal-800 border-teal-100'
  return 'bg-gray-50 text-gray-600 border-gray-100'
}

function auditLabel(action: string): string {
  if (action === 'update_user_access') return 'Acesso atualizado'
  if (action === 'resend_confirmation') return 'Confirmacao reenviada'
  if (action === 'resend_confirmation_skipped') return 'Reenvio ignorado'
  return action.replaceAll('_', ' ')
}

function severityClass(severity: OperationalEvent['severity']): string {
  if (severity === 'critical') return 'bg-red-50 text-red-800 border-red-100'
  if (severity === 'warning') return 'bg-amber-50 text-amber-800 border-amber-100'
  return 'bg-sky-50 text-sky-800 border-sky-100'
}

function severityLabel(severity: OperationalEvent['severity']): string {
  if (severity === 'critical') return 'Critico'
  if (severity === 'warning') return 'Atencao'
  return 'Info'
}

function feedbackCategoryLabel(category: SupportFeedback['category']): string {
  if (category === 'suggestion') return 'Sugestao'
  if (category === 'criticism') return 'Critica'
  if (category === 'support') return 'Suporte'
  if (category === 'bug') return 'Bug'
  return 'Erro no app'
}

function feedbackStatusLabel(status: SupportFeedback['status']): string {
  if (status === 'new') return 'Novo'
  if (status === 'in_review') return 'Em analise'
  if (status === 'resolved') return 'Resolvido'
  return 'Fechado'
}

function feedbackStatusClass(status: SupportFeedback['status']): string {
  if (status === 'new') return 'bg-red-50 text-red-800 border-red-100'
  if (status === 'in_review') return 'bg-amber-50 text-amber-800 border-amber-100'
  if (status === 'resolved') return 'bg-emerald-50 text-emerald-800 border-emerald-100'
  return 'bg-gray-50 text-gray-600 border-gray-100'
}

function supportSeverityClass(severity: SupportFeedback['severity']): string {
  if (severity === 'critical') return 'bg-red-50 text-red-800 border-red-100'
  if (severity === 'high') return 'bg-orange-50 text-orange-800 border-orange-100'
  if (severity === 'low') return 'bg-gray-50 text-gray-600 border-gray-100'
  return 'bg-sky-50 text-sky-800 border-sky-100'
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

function Metric({ label, value, tone = 'gray' }: {
  label: string
  value: number
  tone?: 'gray' | 'amber' | 'sky' | 'teal' | 'red'
}) {
  const toneClass = {
    gray: 'bg-white text-gray-950 border-gray-200/70',
    amber: 'bg-amber-50 text-amber-950 border-amber-100',
    sky: 'bg-sky-50 text-sky-950 border-sky-100',
    teal: 'bg-teal-50 text-teal-950 border-teal-100',
    red: 'bg-red-50 text-red-950 border-red-100',
  }[tone]

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  )
}

export default function AdminView({
  adminEmail,
  initialUsers,
  initialAuditLogs,
  initialOperationalEvents,
  initialSupportFeedback,
}: {
  adminEmail: string
  initialUsers: AdminUser[]
  initialAuditLogs: AdminAuditLog[]
  initialOperationalEvents: OperationalEvent[]
  initialSupportFeedback: SupportFeedback[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [planFilter, setPlanFilter] = useState<PlanType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [users, setUsers] = useState<AdminUser[]>(initialUsers)
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>(initialAuditLogs)
  const [operationalEvents, setOperationalEvents] = useState<OperationalEvent[]>(initialOperationalEvents)
  const [supportFeedback, setSupportFeedback] = useState<SupportFeedback[]>(initialSupportFeedback)
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function loadUsers(search = query) {
    setLoading(true)
    setError(null)
    setNotice(null)

    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())
    if (planFilter !== 'all') params.set('plan', planFilter)
    if (statusFilter !== 'all') params.set('status', statusFilter)

    const response = await fetch(`/api/admin/users?${params.toString()}`)
    const result = await response.json() as {
      users?: AdminUser[]
      auditLogs?: AdminAuditLog[]
      operationalEvents?: OperationalEvent[]
      error?: string
    }

    if (!response.ok) {
      setError(result.error ?? 'Erro ao buscar usuarios.')
      setLoading(false)
      return
    }

    setUsers(result.users ?? [])
    if (result.auditLogs) setAuditLogs(result.auditLogs)
    if (result.operationalEvents) setOperationalEvents(result.operationalEvents)
    setLoading(false)
  }

  async function updateUser(userId: string, patch: Patch) {
    setSavingId(userId)
    setError(null)
    setNotice(null)

    const response = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...patch }),
    })
    const result = await response.json() as {
      user?: AdminUser
      auditLogs?: AdminAuditLog[]
      operationalEvents?: OperationalEvent[]
      error?: string
    }

    if (!response.ok || !result.user) {
      setError(result.error ?? 'Erro ao atualizar usuario.')
      setSavingId(null)
      return
    }

    setUsers((current) => current.map((user) => user.id === userId ? result.user! : user))
    if (result.auditLogs) setAuditLogs(result.auditLogs)
    if (result.operationalEvents) setOperationalEvents(result.operationalEvents)
    setSavingId(null)
  }

  async function resendConfirmation(userId: string) {
    setActionId(userId)
    setError(null)
    setNotice(null)

    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resend_confirmation', user_id: userId }),
    })
    const result = await response.json() as {
      message?: string
      auditLogs?: AdminAuditLog[]
      operationalEvents?: OperationalEvent[]
      error?: string
    }

    if (!response.ok) {
      setError(result.error ?? 'Erro ao reenviar confirmacao.')
      setActionId(null)
      return
    }

    setNotice(result.message ?? 'Confirmacao reenviada.')
    if (result.auditLogs) setAuditLogs(result.auditLogs)
    if (result.operationalEvents) setOperationalEvents(result.operationalEvents)
    setActionId(null)
  }

  async function loadSupportFeedback() {
    setError(null)
    setNotice(null)

    const response = await fetch('/api/admin/support')
    const result = await response.json() as {
      feedback?: SupportFeedback[]
      error?: string
    }

    if (!response.ok) {
      setError(result.error ?? 'Erro ao buscar feedbacks.')
      return
    }

    setSupportFeedback(result.feedback ?? [])
  }

  async function updateSupportFeedback(feedbackId: string, status: SupportFeedback['status']) {
    setActionId(feedbackId)
    setError(null)
    setNotice(null)

    const response = await fetch('/api/admin/support', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback_id: feedbackId, status }),
    })
    const result = await response.json() as {
      feedback?: SupportFeedback
      feedbackList?: SupportFeedback[]
      error?: string
    }

    if (!response.ok) {
      setError(result.error ?? 'Erro ao atualizar feedback.')
      setActionId(null)
      return
    }

    if (result.feedbackList) {
      setSupportFeedback(result.feedbackList)
    } else if (result.feedback) {
      setSupportFeedback((current) => current.map((item) => item.id === feedbackId ? result.feedback! : item))
    }
    setActionId(null)
  }

  const summary = {
    total: users.length,
    pendingEmail: users.filter((user) => !user.email_confirmed_at).length,
    onboardingPending: users.filter((user) => !user.onboarding_done).length,
    professionals: users.filter((user) => user.is_professional).length,
    criticalEvents: operationalEvents.filter((event) => !event.resolved_at && event.severity === 'critical').length,
    warningEvents: operationalEvents.filter((event) => !event.resolved_at && event.severity === 'warning').length,
    openFeedback: supportFeedback.filter((item) => item.status === 'new' || item.status === 'in_review').length,
    appErrors: supportFeedback.filter((item) => item.category === 'app_error' || item.category === 'bug').length,
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
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Metric label="Usuarios" value={summary.total} />
          <Metric label="E-mail pendente" value={summary.pendingEmail} tone="amber" />
          <Metric label="Onboarding pendente" value={summary.onboardingPending} tone="sky" />
          <Metric label="Profissionais" value={summary.professionals} tone="teal" />
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Metric label="Eventos criticos" value={summary.criticalEvents} tone="red" />
          <Metric label="Alertas operacionais" value={summary.warningEvents} tone="amber" />
          <Metric label="Feedbacks abertos" value={summary.openFeedback} tone="sky" />
          <Metric label="Bugs e erros" value={summary.appErrors} tone="red" />
        </section>

        <section className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm">
          <form
            className="grid gap-3 lg:grid-cols-[1fr_150px_190px_auto]"
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
            <select
              value={planFilter}
              onChange={(event) => setPlanFilter(event.target.value as PlanType | 'all')}
              className="rounded-lg border border-gray-200 bg-white text-gray-950 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-500"
            >
              <option value="all">Todos planos</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="clinic">Clinica</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-gray-200 bg-white text-gray-950 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-500"
            >
              <option value="all">Todos status</option>
              <option value="pending_email">E-mail pendente</option>
              <option value="confirmed">E-mail confirmado</option>
              <option value="onboarding_pending">Onboarding pendente</option>
              <option value="professional">Profissionais</option>
            </select>
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
        {notice && (
          <div className="bg-teal-50 border border-teal-100 rounded-lg p-3">
            <p className="text-sm text-teal-800">{notice}</p>
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
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                          user.email_confirmed_at
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                            : 'bg-amber-50 text-amber-800 border-amber-100'
                        }`}>
                          {user.email_confirmed_at ? 'E-mail confirmado' : 'E-mail pendente'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 break-all">{user.email}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-400">
                        <span>Cadastro: {formatDate(user.created_at)}</span>
                        <span>Confirmacao: {formatDate(user.email_confirmed_at)}</span>
                        <span>Ultimo login: {formatDateTime(user.last_sign_in_at)}</span>
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
                          {!user.email_confirmed_at && (
                            <button
                              type="button"
                              disabled={actionId === user.id || saving}
                              onClick={() => void resendConfirmation(user.id)}
                              className="px-3 py-2 rounded-lg border text-xs font-medium bg-amber-50 text-amber-800 border-amber-100 hover:bg-amber-100 transition-colors disabled:opacity-60"
                            >
                              {actionId === user.id ? 'Reenviando...' : 'Reenviar confirmacao'}
                            </button>
                          )}
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

        <section className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-950">Feedback, suporte e erros</h2>
              <p className="text-xs text-gray-500 mt-0.5">Sugestoes dos usuarios, criticas e relatos enviados pelo app.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadSupportFeedback()}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Atualizar
            </button>
          </div>

          {supportFeedback.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">Nenhum feedback registrado ainda.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {supportFeedback.map((item) => (
                <div key={item.id} className="py-4">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${feedbackStatusClass(item.status)}`}>
                          {feedbackStatusLabel(item.status)}
                        </span>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${supportSeverityClass(item.severity)}`}>
                          {item.severity}
                        </span>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-teal-50 text-teal-800 border-teal-100">
                          {feedbackCategoryLabel(item.category)}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-950 mt-2">{item.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{item.message}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-400">
                        <span>Data: {formatDateTime(item.created_at)}</span>
                        {item.user_email && <span>Usuario: {item.user_email}</span>}
                        {item.page_url && <span className="break-all">Tela: {item.page_url}</span>}
                        {item.sentry_event_id && <span>Sentry: {item.sentry_event_id}</span>}
                        {item.error_digest && <span>Digest: {item.error_digest}</span>}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:min-w-[280px] lg:justify-end">
                      {(['new', 'in_review', 'resolved', 'closed'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          disabled={actionId === item.id || item.status === status}
                          onClick={() => void updateSupportFeedback(item.id, status)}
                          className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors disabled:opacity-60 ${
                            item.status === status
                              ? 'bg-teal-800 text-white border-teal-800'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {feedbackStatusLabel(status)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-950">Monitoramento operacional</h2>
              <p className="text-xs text-gray-500 mt-0.5">Falhas recentes de e-mail, login e operacoes criticas.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadUsers()}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Atualizar
            </button>
          </div>

          {operationalEvents.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">Nenhum evento operacional registrado.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {operationalEvents.map((event) => (
                <div key={event.id} className="py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${severityClass(event.severity)}`}>
                        {severityLabel(event.severity)}
                      </span>
                      <p className="text-sm font-medium text-gray-900">{event.message}</p>
                    </div>
                    <p className="text-xs text-gray-400">{formatDateTime(event.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                    <span>Area: {event.area}</span>
                    <span>Tipo: {event.event_type}</span>
                    {event.user_email && <span>Usuario: {event.user_email}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-950">Atividade administrativa</h2>
              <p className="text-xs text-gray-500 mt-0.5">Ultimas acoes feitas pelo suporte.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadUsers()}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Atualizar
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">Nenhuma atividade registrada ainda.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <p className="text-sm font-medium text-gray-900">{auditLabel(log.action)}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(log.created_at)}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {log.summary ?? 'Acao administrativa registrada.'}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                    <span>Admin: {log.actor_email}</span>
                    {log.target_email && <span>Usuario: {log.target_email}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs text-gray-400 text-center">
          O acesso admin e controlado por ADMIN_EMAILS no ambiente da aplicacao.
        </p>
      </main>
    </div>
  )
}
