import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Json, ProtocolPhase } from '@/lib/supabase/types'

export const metadata = {
  title: 'Historico do protocolo - IODO RESET',
}

const PHASE_LABELS: Record<ProtocolPhase, string> = {
  '0': 'Pre-protocolo',
  '1': 'Fase 1 - Ativacao',
  '2': 'Fase 2 - Progressao',
  '3': 'Fase 3 - Detox',
  '4': 'Fase 4 - Estabilizacao',
}

type ProgressionEvent = {
  id: string
  source: 'auto' | 'professional'
  from_phase: ProtocolPhase
  to_phase: ProtocolPhase
  from_dose_drops: number
  to_dose_drops: number
  reason: string
  metadata: Json
  created_at: string
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDose(drops: number) {
  if (drops === 0) return 'sem iodo'
  return `${drops} gota${drops === 1 ? '' : 's'}`
}

function eventTitle(event: ProgressionEvent) {
  if (event.source === 'professional') return 'Ajuste profissional'
  if (event.to_dose_drops < event.from_dose_drops) return 'Ajuste automatico por seguranca'
  if (event.to_phase !== event.from_phase) return 'Progressao automatica'
  return 'Dose atualizada automaticamente'
}

function sourceTone(source: ProgressionEvent['source']) {
  return source === 'professional'
    ? 'bg-indigo-50 text-indigo-800 border-indigo-100'
    : 'bg-teal-50 text-teal-800 border-teal-100'
}

function metadataText(metadata: Json) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const readiness = metadata.readiness_percent
  const loggedDays = metadata.logged_days
  const cofactors = metadata.cofactor_ready_days

  const parts = [
    typeof readiness === 'number' ? `${readiness}% pronto` : null,
    typeof loggedDays === 'number' ? `${loggedDays} registros recentes` : null,
    typeof cofactors === 'number' ? `${cofactors} dias com cofatores` : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' - ') : null
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M12.5 4L7 10l5.5 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TimelineIcon({ source }: { source: ProgressionEvent['source'] }) {
  return source === 'professional' ? (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3.5a3 3 0 013 3v1h.5A1.5 1.5 0 0115 9v6a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 015 15V9a1.5 1.5 0 011.5-1.5H7v-1a3 3 0 013-3z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7.5h4v-1a2 2 0 00-4 0v1z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 11.5A6 6 0 1010 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 6v5.5h5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 7.5v3l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EmptyState() {
  return (
    <section className="rounded-lg border border-gray-200/70 bg-white p-5 shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-800">
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M4 15.5h12M5 12l3-3 2 2 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="mt-4 text-center text-base font-semibold text-gray-950">Nenhuma evolucao registrada ainda</h2>
      <p className="mt-2 text-center text-sm leading-relaxed text-gray-500">
        Quando o app ajustar fase ou dose, ou quando seu profissional enviar um ajuste, tudo aparecera aqui.
      </p>
      <Link
        href="/dashboard"
        className="mt-4 block rounded-lg bg-teal-800 px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-teal-900"
      >
        Voltar ao dashboard
      </Link>
    </section>
  )
}

export default async function ProtocolHistoryPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('onboarding_done')
    .eq('id', user.id)
    .single<{ onboarding_done: boolean }>()

  if (!userData?.onboarding_done) redirect('/onboarding')

  const { data: events } = await supabase
    .from('protocol_progression_events')
    .select('id, source, from_phase, to_phase, from_dose_drops, to_dose_drops, reason, metadata, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<ProgressionEvent[]>()

  const history = events ?? []

  return (
    <div className="min-h-screen bg-[#F7FAF9] pb-8">
      <header className="bg-teal-800 px-4 pb-6 pt-12">
        <div className="mx-auto max-w-lg">
          <Link href="/dashboard" className="mb-4 flex items-center gap-1 text-xs text-teal-100/80 transition-colors hover:text-white">
            <BackIcon />
            Dashboard
          </Link>
          <p className="text-sm text-teal-100/80">Evolucao do protocolo</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Historico de fase e dose</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-teal-50/80">
            Acompanhe cada mudanca feita pelo app ou pelo profissional que monitora seu protocolo.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        <section className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-gray-200/70 bg-white p-3 shadow-sm">
            <p className="text-xs text-gray-500">Eventos</p>
            <p className="mt-1 text-2xl font-semibold text-gray-950">{history.length}</p>
          </div>
          <div className="rounded-lg border border-gray-200/70 bg-white p-3 shadow-sm">
            <p className="text-xs text-gray-500">Ultima mudanca</p>
            <p className="mt-1 text-sm font-semibold text-gray-950">
              {history[0] ? formatDateTime(history[0].created_at) : 'Sem registro'}
            </p>
          </div>
        </section>

        {history.length === 0 ? (
          <EmptyState />
        ) : (
          <section className="space-y-3">
            {history.map((event) => {
              const extra = metadataText(event.metadata)

              return (
                <article key={event.id} className="rounded-lg border border-gray-200/70 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${sourceTone(event.source)}`}>
                      <TimelineIcon source={event.source} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-sm font-semibold text-gray-950">{eventTitle(event)}</h2>
                          <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(event.created_at)}</p>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${sourceTone(event.source)}`}>
                          {event.source === 'professional' ? 'Profissional' : 'App'}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-gray-100 bg-slate-50 p-3">
                          <p className="text-[11px] text-gray-400">Antes</p>
                          <p className="mt-1 text-xs font-medium text-gray-800">{PHASE_LABELS[event.from_phase]}</p>
                          <p className="mt-0.5 text-xs text-gray-500">{formatDose(event.from_dose_drops)}</p>
                        </div>
                        <div className="rounded-lg border border-teal-100 bg-teal-50 p-3">
                          <p className="text-[11px] text-teal-700/70">Depois</p>
                          <p className="mt-1 text-xs font-medium text-teal-950">{PHASE_LABELS[event.to_phase]}</p>
                          <p className="mt-0.5 text-xs text-teal-800">{formatDose(event.to_dose_drops)}</p>
                        </div>
                      </div>

                      <p className="mt-3 text-xs leading-relaxed text-gray-600">{event.reason}</p>
                      {extra && <p className="mt-2 text-[11px] text-gray-400">{extra}</p>}
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </main>
    </div>
  )
}
