'use client'
// src/app/dashboard/DashboardView.tsx
// Client Component — toda a UI interativa do dashboard

import { useRouter, usePathname } from 'next/navigation'
import type { DashboardData } from './page'
import type { SemaphoreColor, ProtocolPhase } from '@/lib/supabase/types'

import AnalysisCard from '@/components/AnalysisCard'

// ── Helpers ───────────────────────────────────────────────────

function daysInProtocol(startDate: string | null): number {
  if (!startDate) return 0
  const start = new Date(startDate)
  const today = new Date()
  const diff  = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0]
}

const PHASE_LABELS: Record<ProtocolPhase, string> = {
  '0': 'Pré-protocolo',
  '1': 'Fase 1 — Ativação',
  '2': 'Fase 2 — Progressão',
  '3': 'Fase 3 — Detox',
  '4': 'Fase 4 — Estabilização',
}

const COFACTORS_BY_PHASE: Record<ProtocolPhase, string[]> = {
  '0': ['Selênio 200 mcg', 'Magnésio 400 mg', 'Vitamina D3 + K2', 'Vitaminas B2 + B3', 'Vitamina C 1g'],
  '1': ['Selênio 200 mcg', 'Magnésio 400 mg', 'Vitamina C 2g', 'Vitaminas B2 + B3', 'Vitamina D3 + K2', 'Sal integral ½ col. chá'],
  '2': ['Selênio 200 mcg', 'Magnésio 400 mg', 'Vitamina C 3g', 'Vitaminas B2 + B3', 'Vitamina D3 + K2', 'Sal integral ½ col. chá'],
  '3': ['Selênio 400 mcg', 'Magnésio 400 mg', 'Vitamina C 3–6g', 'Vitaminas B2 + B3', 'Vitamina D3 + K2', 'Sal integral ½ col. chá'],
  '4': ['Selênio 200 mcg', 'Magnésio 400 mg', 'Vitamina C 2g', 'Vitaminas B2 + B3', 'Vitamina D3 + K2'],
}

// ── Semáforo ──────────────────────────────────────────────────
const SEM_CONFIG: Record<SemaphoreColor, { bg: string; text: string; label: string; desc: string }> = {
  green:  { bg: 'bg-emerald-500', text: 'text-emerald-700', label: 'Continuar protocolo',    desc: 'Tudo certo — siga com a dose atual.' },
  yellow: { bg: 'bg-amber-400',   text: 'text-amber-700',   label: 'Atenção — mantenha dose', desc: 'Mantenha a dose e aumente água e sal.' },
  red:    { bg: 'bg-red-500',     text: 'text-red-700',     label: 'Pausar 2 dias',           desc: 'Reduza a dose ou pause por 2 dias.' },
}

function SemaphoreIndicator({ color }: { color: SemaphoreColor }) {
  const cfg = SEM_CONFIG[color]
  return (
    <div className="flex items-center gap-3">
      <div className={`w-4 h-4 rounded-full ${cfg.bg} flex-shrink-0`} />
      <div>
        <p className={`text-sm font-medium ${cfg.text}`}>{cfg.label}</p>
        <p className="text-xs text-gray-500">{cfg.desc}</p>
      </div>
    </div>
  )
}

// ── Metric Card ───────────────────────────────────────────────
function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Mini bar chart ────────────────────────────────────────────
function MiniBar({ value, max = 10, color }: { value: number | null; max?: number; color: string }) {
  const pct = value ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Navigation bar ────────────────────────────────────────────
function NavBar() {
  const router   = useRouter()
  const pathname = usePathname()

  const items = [
    { label: 'Dashboard', path: '/dashboard', icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="11" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="11" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    )},
    { label: 'Diário', path: '/diary', icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="7" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="7" y1="10" x2="13" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="7" y1="13" x2="10" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )},
    { label: 'Exames', path: '/exams', icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    )},
    { label: 'Perfil', path: '/profile', icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )},
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
      <div className="max-w-lg mx-auto flex">
        {items.map((item) => {
          const active = pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                active ? 'text-teal-700' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {item.icon}
              <span className={`text-xs ${active ? 'font-medium' : ''}`}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function DashboardView({ data }: { data: DashboardData }) {
  const router = useRouter()

  const days        = daysInProtocol(data.protocolStartDate)
  const cofactors   = COFACTORS_BY_PHASE[data.phase]
  const hasLogToday = data.lastLog ? isToday(data.lastLog.log_date) : false
  const semaphore   = hasLogToday ? data.lastLog!.semaphore : 'green'
  const hasChartData = data.recentLogs.length >= 2

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── Header ── */}
      <div className="bg-teal-700 pt-12 pb-6 px-4">
        <div className="max-w-lg mx-auto">
          <p className="text-teal-200 text-sm mb-1">Olá,</p>
          <h1 className="text-white text-2xl font-semibold">{data.userName}</h1>
          <div className="mt-3 flex items-center gap-2">
            <span className="bg-teal-600 text-teal-100 text-xs font-medium px-3 py-1 rounded-full">
              {PHASE_LABELS[data.phase]}
            </span>
            <span className="bg-teal-600 text-teal-100 text-xs font-medium px-3 py-1 rounded-full">
              {data.drops === 0 ? 'Sem iodo — cofatores' : `${data.drops} gota${data.drops > 1 ? 's' : ''}/dia`}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-1 space-y-4 pt-4">

        {/* ── Semáforo do dia ── */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">Status de hoje</p>
            {!hasLogToday && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                Sem registro hoje
              </span>
            )}
          </div>
          <SemaphoreIndicator color={semaphore} />
        </div>

        {/* ── Botão registrar hoje ── */}
        <button
          onClick={() => router.push('/diary')}
          className="w-full bg-teal-700 hover:bg-teal-800 active:scale-[0.98]
                     text-white font-medium py-4 rounded-xl text-base transition-all
                     flex items-center justify-center gap-2 shadow-sm"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5"/>
            <path d="M10 6v8M6 10h8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {hasLogToday ? 'Editar registro de hoje' : 'Registrar hoje'}
        </button>

        {/* ── Métricas ── */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Dose atual"
            value={data.drops === 0 ? '—' : data.drops}
            sub={data.drops === 0 ? 'sem iodo por ora' : `gota${data.drops > 1 ? 's' : ''} · ${(data.drops * 6.25).toFixed(1)}mg`}
          />
          <MetricCard
            label="Dias no protocolo"
            value={days}
            sub={days === 0 ? 'início hoje' : `dia${days > 1 ? 's' : ''} desde o início`}
          />
          <MetricCard
            label="Fase atual"
            value={data.phase}
            sub={PHASE_LABELS[data.phase]}
          />
          <MetricCard
            label="Cofatores"
            value={cofactors.length}
            sub="recomendados hoje"
          />
        </div>

        <AnalysisCard
          logId={data.lastLog?.id ?? null}
          hasLog={hasLogToday}
          isPro={false} // substituir por data.plan === 'pro' quando tiver Stripe
          analyses={0} // buscar do banco depois
        />

        {/* ── Último registro (se tiver) ── */}
        {data.lastLog && (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">
                {hasLogToday ? 'Registro de hoje' : `Último registro — ${new Date(data.lastLog.log_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
              </p>
              <span className="text-xs text-gray-400">{data.lastLog.dose_drops} gotas</span>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Energia',  value: data.lastLog.energy,        color: 'bg-teal-500' },
                { label: 'Humor',    value: data.lastLog.mood,          color: 'bg-purple-400' },
                { label: 'Sono',     value: data.lastLog.sleep_quality, color: 'bg-blue-400'   },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-14">{label}</span>
                  <MiniBar value={value} color={color} />
                  <span className="text-xs font-medium text-gray-600 w-4 text-right">
                    {value ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Evolução 7 dias ── */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Evolução — 7 dias</p>

          {hasChartData ? (
            <div className="space-y-2">
              {data.recentLogs.map((log) => {
                const date = new Date(log.log_date + 'T12:00:00')
                const label = date.toLocaleDateString('pt-BR', { weekday: 'short' })
                return (
                  <div key={log.log_date} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-8 capitalize">{label}</span>
                    <MiniBar value={log.energy}        color="bg-teal-500"   />
                    <MiniBar value={log.mood}          color="bg-purple-400" />
                    <MiniBar value={log.sleep_quality} color="bg-blue-400"   />
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      log.semaphore === 'green'  ? 'bg-emerald-500' :
                      log.semaphore === 'yellow' ? 'bg-amber-400'   : 'bg-red-500'
                    }`} />
                  </div>
                )
              })}
              <div className="flex gap-3 mt-2 pt-2 border-t border-gray-50">
                {[
                  { color: 'bg-teal-500',   label: 'Energia'  },
                  { color: 'bg-purple-400', label: 'Humor'    },
                  { color: 'bg-blue-400',   label: 'Sono'     },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-xs text-gray-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 14l4-5 4 3 4-7" stroke="#9CA3AF" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm text-gray-500">Sem dados ainda</p>
              <p className="text-xs text-gray-400 mt-1">
                Faça pelo menos 2 registros para ver a evolução
              </p>
            </div>
          )}
        </div>

        {/* ── Cofatores de hoje ── */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Cofatores de hoje</p>
          <div className="space-y-2">
            {cofactors.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md border border-teal-200 bg-teal-50
                                flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5.5L4 8L8.5 3" stroke="#0F6E56" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-sm text-gray-700">{c}</span>
              </div>
            ))}
          </div>
          {data.phase === '0' && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-xs text-amber-800 leading-relaxed">
                Você está na fase de preparação. Tome os cofatores por pelo menos 3 meses antes de iniciar o iodo.
              </p>
            </div>
          )}
        </div>

        {/* ── Aviso educacional ── */}
        <p className="text-xs text-gray-400 text-center pb-2">
          Conteúdo educacional · Não substitui orientação médica profissional
        </p>

      </div>

      <NavBar />
    </div>
  )
}
