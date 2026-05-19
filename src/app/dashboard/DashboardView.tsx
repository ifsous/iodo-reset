'use client'
import { useRouter, usePathname } from 'next/navigation'
import type { DashboardData } from './page'
import type { TimelineStepStatus, WeeklyGoalStatus } from '@/lib/protocol/patient-insights'
import type { RetentionActionTarget, RetentionTone } from '@/lib/protocol/patient-retention'
import type { ProgressHistoryTone } from '@/lib/protocol/progress-history'
import type { ProgressionCriterionStatus } from '@/lib/protocol/progression-readiness'
import type { TodayPlanStatus } from '@/lib/protocol/today-plan'
import type { Json, ProgressionStrategy, ProtocolPhase, ProtocolRiskLevel, SemaphoreColor } from '@/lib/supabase/types'
import AnalysisCard from '@/components/AnalysisCard'

function daysInProtocol(startDate: string | null): number {
  if (!startDate) return 0
  const diff = Math.floor((new Date().getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
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

const RISK_LABELS: Record<ProtocolRiskLevel, { label: string; tone: string; note: string }> = {
  standard: {
    label: 'Protocolo padrao',
    tone: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    note: 'Siga acompanhando sintomas, cofatores e exames.',
  },
  caution: {
    label: 'Protocolo conservador',
    tone: 'bg-amber-50 border-amber-100 text-amber-800',
    note: 'Priorize cofatores e avance apenas com boa tolerancia.',
  },
  professional_only: {
    label: 'Somente com profissional',
    tone: 'bg-red-50 border-red-100 text-red-800',
    note: 'Nao inicie nem suba dose sem acompanhamento profissional.',
  },
}

const STRATEGY_LABELS: Record<ProgressionStrategy, string> = {
  cofactors_first: 'Cofatores primeiro',
  slow: 'Progressao lenta',
  standard: 'Progressao padrao',
  supervised: 'Supervisionado',
}

type ExamScheduleItem = {
  key?: string
  label?: string
  timing?: string
}

function parseExamSchedule(value: Json): ExamScheduleItem[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, Json | undefined> => item !== null && typeof item === 'object' && !Array.isArray(item))
    .map((item) => ({
      key: typeof item.key === 'string' ? item.key : undefined,
      label: typeof item.label === 'string' ? item.label : undefined,
      timing: typeof item.timing === 'string' ? item.timing : undefined,
    }))
}

const COFACTORS_BY_PHASE: Record<ProtocolPhase, string[]> = {
  '0': ['Selênio 200 mcg', 'Magnésio 400 mg', 'Vitamina D3 + K2', 'Vitaminas B2 + B3', 'Vitamina C 1g'],
  '1': ['Selênio 200 mcg', 'Magnésio 400 mg', 'Vitamina C 2g', 'Vitaminas B2 + B3', 'Vitamina D3 + K2', 'Sal integral ½ col. chá'],
  '2': ['Selênio 200 mcg', 'Magnésio 400 mg', 'Vitamina C 3g', 'Vitaminas B2 + B3', 'Vitamina D3 + K2', 'Sal integral ½ col. chá'],
  '3': ['Selênio 400 mcg', 'Magnésio 400 mg', 'Vitamina C 3–6g', 'Vitaminas B2 + B3', 'Vitamina D3 + K2', 'Sal integral ½ col. chá'],
  '4': ['Selênio 200 mcg', 'Magnésio 400 mg', 'Vitamina C 2g', 'Vitaminas B2 + B3', 'Vitamina D3 + K2'],
}

const SEM_CONFIG: Record<SemaphoreColor, { bg: string; text: string; label: string; desc: string }> = {
  green:  { bg: 'bg-emerald-500', text: 'text-emerald-700', label: 'Continuar protocolo',    desc: 'Tudo certo — siga com a dose atual.'       },
  yellow: { bg: 'bg-amber-400',   text: 'text-amber-700',   label: 'Atenção — mantenha dose', desc: 'Mantenha a dose e aumente água e sal.'     },
  red:    { bg: 'bg-red-500',     text: 'text-red-700',     label: 'Pausar 2 dias',           desc: 'Reduza a dose ou pause por 2 dias.'        },
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

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

const RETENTION_TONES: Record<RetentionTone, { border: string; bg: string; text: string; dot: string; badge: string }> = {
  good: {
    border: 'border-emerald-100',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  },
  watch: {
    border: 'border-amber-100',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-800 border-amber-100',
  },
  alert: {
    border: 'border-red-100',
    bg: 'bg-red-50',
    text: 'text-red-800',
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-800 border-red-100',
  },
  neutral: {
    border: 'border-sky-100',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    dot: 'bg-sky-500',
    badge: 'bg-sky-50 text-sky-800 border-sky-100',
  },
}

function targetPath(target: RetentionActionTarget): string {
  if (target === 'diary') return '/diary'
  if (target === 'exams') return '/exams'
  if (target === 'profile') return '/profile'
  return '/protocol'
}

function CheckInCard({
  data,
  onNavigate,
}: {
  data: DashboardData['patientRetention']['checkIn']
  onNavigate: (target: RetentionActionTarget) => void
}) {
  const tone = RETENTION_TONES[data.tone]

  return (
    <div className={`bg-white rounded-lg border ${tone.border} p-4 shadow-sm space-y-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 mb-1">Check-in do dia</p>
          <h2 className="text-lg font-semibold text-gray-900 leading-tight">{data.title}</h2>
          <p className="text-xs text-gray-600 leading-relaxed mt-1">{data.summary}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${tone.badge}`}>
          {data.streakDays > 0 ? `${data.streakDays} dia${data.streakDays > 1 ? 's' : ''}` : 'Hoje'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-lg border ${tone.border} ${tone.bg} p-3`}>
          <p className="text-xs text-gray-500">Sequencia</p>
          <p className={`text-xl font-semibold mt-1 ${tone.text}`}>{data.streakDays}</p>
          <p className="text-[11px] text-gray-500 mt-1">dias registrados seguidos</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-slate-50 p-3">
          <p className="text-xs text-gray-500">Sem registrar</p>
          <p className="text-xl font-semibold text-gray-900 mt-1">{data.missedDays > 30 ? '-' : data.missedDays}</p>
          <p className="text-[11px] text-gray-500 mt-1">dias desde o ultimo check-in</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onNavigate(data.primaryAction.target)}
        className="w-full bg-teal-800 hover:bg-teal-900 active:scale-[0.98] text-white font-medium py-3 rounded-lg text-sm transition-all shadow-sm"
      >
        {data.primaryAction.label}
      </button>
    </div>
  )
}

function NextActionsCard({
  actions,
  onNavigate,
}: {
  actions: DashboardData['patientRetention']['nextActions']
  onNavigate: (target: RetentionActionTarget) => void
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm space-y-3">
      <div>
        <p className="text-xs text-gray-500 mb-1">Proximos passos</p>
        <h2 className="text-base font-semibold text-gray-900 leading-tight">O que fazer agora</h2>
      </div>

      <div className="space-y-2">
        {actions.map((action) => (
          <button
            key={`${action.target}-${action.label}`}
            type="button"
            onClick={() => onNavigate(action.target)}
            className={`w-full text-left rounded-lg border px-3 py-3 transition-colors ${
              action.priority === 'primary'
                ? 'border-teal-100 bg-teal-50 hover:bg-teal-100/70'
                : 'border-gray-100 bg-slate-50 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{action.label}</p>
                <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{action.detail}</p>
              </div>
              <span className="text-lg leading-none text-gray-300">›</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function ReminderRail({
  reminders,
  onNavigate,
}: {
  reminders: DashboardData['patientRetention']['reminders']
  onNavigate: (target: RetentionActionTarget) => void
}) {
  if (reminders.length === 0) return null

  return (
    <div className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm space-y-3">
      <div>
        <p className="text-xs text-gray-500 mb-1">Lembretes</p>
        <h2 className="text-base font-semibold text-gray-900 leading-tight">Nao deixar passar</h2>
      </div>

      <div className="space-y-2">
        {reminders.map((reminder) => {
          const tone = RETENTION_TONES[reminder.tone]
          return (
            <button
              key={`${reminder.target}-${reminder.label}`}
              type="button"
              onClick={() => onNavigate(reminder.target)}
              className="w-full flex items-start gap-3 rounded-lg border border-gray-100 bg-slate-50 px-3 py-2 text-left hover:bg-gray-100 transition-colors"
            >
              <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${tone.dot}`} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-gray-800">{reminder.label}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${tone.badge}`}>
                    {reminder.dueLabel}
                  </span>
                </span>
                <span className="block text-xs text-gray-500 leading-relaxed mt-0.5">{reminder.detail}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const TODAY_PLAN_TONES: Record<TodayPlanStatus, { border: string; badge: string; accent: string; iconBg: string }> = {
  ok: {
    border: 'border-emerald-100',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    accent: 'text-emerald-700',
    iconBg: 'bg-emerald-500',
  },
  caution: {
    border: 'border-amber-100',
    badge: 'bg-amber-50 text-amber-800 border-amber-100',
    accent: 'text-amber-700',
    iconBg: 'bg-amber-400',
  },
  pause: {
    border: 'border-red-100',
    badge: 'bg-red-50 text-red-800 border-red-100',
    accent: 'text-red-700',
    iconBg: 'bg-red-500',
  },
  prepare: {
    border: 'border-sky-100',
    badge: 'bg-sky-50 text-sky-800 border-sky-100',
    accent: 'text-sky-700',
    iconBg: 'bg-sky-500',
  },
  professional: {
    border: 'border-red-100',
    badge: 'bg-red-50 text-red-800 border-red-100',
    accent: 'text-red-700',
    iconBg: 'bg-red-500',
  },
}

function TodayPlanCard({
  data,
  hasLogToday,
  onRegister,
}: {
  data: DashboardData['todayPlan']
  hasLogToday: boolean
  onRegister: () => void
}) {
  const tone = TODAY_PLAN_TONES[data.status]

  return (
    <div className={`bg-white rounded-lg border ${tone.border} p-4 shadow-sm space-y-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${tone.iconBg} flex-shrink-0`} />
          <div>
            <p className="text-xs text-gray-500 mb-1">Plano de hoje</p>
            <h2 className="text-lg font-semibold text-gray-900 leading-tight">{data.title}</h2>
          </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${tone.badge}`}>
          {data.badge}
        </span>
      </div>

      <div className="space-y-2">
        <p className={`text-sm font-medium leading-relaxed ${tone.accent}`}>{data.primaryAction}</p>
        <p className="text-xs text-gray-600 leading-relaxed">{data.reason}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {data.checklist.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
              item.priority === 'high' ? 'border-teal-100 bg-teal-50/50' : 'border-gray-100 bg-slate-50'
            }`}
          >
            <div className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 ${
              item.done === true
                ? 'bg-teal-700 border-teal-700'
                : item.done === false
                  ? 'bg-white border-gray-300'
                  : 'bg-gray-100 border-gray-200'
            }`}>
              {item.done === true && (
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5.5L4 8L8.5 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span className="text-xs font-medium text-gray-700 truncate">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-3 flex flex-col gap-3">
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="font-medium text-gray-700">Observar amanhã:</span> {data.tomorrowFocus}
        </p>
        <button
          type="button"
          onClick={onRegister}
          className="w-full bg-teal-800 hover:bg-teal-900 active:scale-[0.98] text-white font-medium py-3 rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5"/>
            <path d="M10 6v8M6 10h8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {hasLogToday ? 'Editar registro de hoje' : 'Registrar hoje'}
        </button>
      </div>
    </div>
  )
}

const CRITERION_STYLES: Record<ProgressionCriterionStatus, { dot: string; label: string }> = {
  met: {
    dot: 'bg-emerald-500',
    label: 'ok',
  },
  partial: {
    dot: 'bg-amber-400',
    label: 'ajustar',
  },
  blocked: {
    dot: 'bg-red-500',
    label: 'pendente',
  },
}

function ProgressionReadinessCard({
  data,
  onOpenProtocol,
}: {
  data: DashboardData['progressionReadiness']
  onOpenProtocol: () => void
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Para avancar</p>
          <h2 className="text-base font-semibold text-gray-900 leading-tight">{data.title}</h2>
          <p className="text-xs text-gray-600 leading-relaxed mt-1">{data.summary}</p>
        </div>
        <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-lg font-semibold text-teal-800">{data.readinessPercent}%</span>
          <span className="text-[10px] text-gray-400">pronto</span>
        </div>
      </div>

      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full bg-teal-700 rounded-full" style={{ width: `${data.readinessPercent}%` }} />
      </div>

      <div className="space-y-2">
        {data.criteria.map((item) => {
          const style = CRITERION_STYLES[item.status]
          return (
            <div key={item.label} className="flex items-start gap-3 rounded-lg bg-slate-50 border border-gray-100 px-3 py-2">
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-gray-800 truncate">{item.label}</p>
                  <span className="text-[10px] uppercase tracking-wide text-gray-400 flex-shrink-0">{style.label}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{item.detail}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-gray-100 pt-3 flex flex-col gap-3">
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="font-medium text-gray-700">Proximo foco:</span> {data.nextStep}
        </p>
        <button
          type="button"
          onClick={onOpenProtocol}
          className="w-full rounded-lg border border-teal-200 text-teal-800 text-sm font-medium py-3 hover:bg-teal-50 transition-colors"
        >
          Ver guia do protocolo
        </button>
      </div>
    </div>
  )
}

const HISTORY_TONES: Record<ProgressHistoryTone, { dot: string; text: string; bg: string; border: string }> = {
  good: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  watch: {
    dot: 'bg-amber-400',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
  alert: {
    dot: 'bg-red-500',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-100',
  },
  neutral: {
    dot: 'bg-slate-400',
    text: 'text-gray-700',
    bg: 'bg-slate-50',
    border: 'border-gray-100',
  },
}

function ProgressHistoryCard({ data }: { data: DashboardData['progressHistory'] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm space-y-4">
      <div>
        <p className="text-xs text-gray-500 mb-1">Historico de progresso</p>
        <h2 className="text-base font-semibold text-gray-900 leading-tight">{data.title}</h2>
        <p className="text-xs text-gray-600 leading-relaxed mt-1">{data.summary}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {data.metrics.map((metric) => {
          const tone = HISTORY_TONES[metric.tone]
          return (
            <div key={metric.label} className={`rounded-lg border ${tone.border} ${tone.bg} p-3`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-gray-500">{metric.label}</p>
                <span className={`w-2 h-2 rounded-full ${tone.dot} flex-shrink-0`} />
              </div>
              <p className={`text-xl font-semibold mt-1 ${tone.text}`}>{metric.value}</p>
              <p className="text-[11px] text-gray-500 leading-snug mt-1">{metric.detail}</p>
            </div>
          )
        })}
      </div>

      <div className="space-y-2">
        {data.events.map((event) => {
          const tone = HISTORY_TONES[event.tone]
          return (
            <div key={event.label} className="flex items-start gap-3 rounded-lg bg-slate-50 border border-gray-100 px-3 py-2">
              <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${tone.dot} flex-shrink-0`} />
              <div>
                <p className="text-xs font-medium text-gray-800">{event.label}</p>
                <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{event.detail}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const GOAL_STYLES: Record<WeeklyGoalStatus, { bar: string; badge: string; label: string }> = {
  done: {
    bar: 'bg-emerald-600',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    label: 'feito',
  },
  active: {
    bar: 'bg-teal-700',
    badge: 'bg-teal-50 text-teal-800 border-teal-100',
    label: 'em andamento',
  },
  blocked: {
    bar: 'bg-red-500',
    badge: 'bg-red-50 text-red-800 border-red-100',
    label: 'pausar',
  },
}

function WeeklyGoalsCard({ data }: { data: DashboardData['patientInsights']['weeklyGoals'] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm space-y-4">
      <div>
        <p className="text-xs text-gray-500 mb-1">Metas da semana</p>
        <h2 className="text-base font-semibold text-gray-900 leading-tight">O que mais ajuda seu progresso agora</h2>
      </div>

      <div className="space-y-3">
        {data.map((goal) => {
          const style = GOAL_STYLES[goal.status]
          return (
            <div key={goal.label} className="rounded-lg border border-gray-100 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{goal.label}</p>
                  <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{goal.detail}</p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${style.badge}`}>
                  {style.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex-1 h-2 rounded-full bg-white border border-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${goal.progressPercent}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-10 text-right">{goal.value}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const TIMELINE_STYLES: Record<TimelineStepStatus, { dot: string; text: string; border: string }> = {
  done: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    border: 'border-emerald-100 bg-emerald-50',
  },
  current: {
    dot: 'bg-teal-700',
    text: 'text-teal-800',
    border: 'border-teal-100 bg-teal-50',
  },
  next: {
    dot: 'bg-sky-500',
    text: 'text-sky-700',
    border: 'border-sky-100 bg-sky-50',
  },
  locked: {
    dot: 'bg-gray-300',
    text: 'text-gray-500',
    border: 'border-gray-100 bg-slate-50',
  },
}

function ProtocolTimelineCard({ data }: { data: DashboardData['patientInsights']['timeline'] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm space-y-4">
      <div>
        <p className="text-xs text-gray-500 mb-1">Linha do tempo</p>
        <h2 className="text-base font-semibold text-gray-900 leading-tight">Onde voce esta no protocolo</h2>
      </div>

      <div className="space-y-2">
        {data.map((step) => {
          const style = TIMELINE_STYLES[step.status]
          return (
            <div key={step.phase} className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${style.border}`}>
              <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${style.text}`}>
                  Fase {step.phase} - {step.label}
                </p>
                <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{step.detail}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DoseExplanationCard({ data }: { data: DashboardData['patientInsights']['doseExplanation'] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm space-y-3">
      <div>
        <p className="text-xs text-gray-500 mb-1">Entenda sua dose</p>
        <h2 className="text-base font-semibold text-gray-900 leading-tight">{data.title}</h2>
        <p className="text-xs text-gray-600 leading-relaxed mt-1">{data.summary}</p>
      </div>

      <div className="space-y-2">
        {data.reasons.map((reason) => (
          <div key={reason} className="flex items-start gap-2 rounded-lg bg-slate-50 border border-gray-100 px-3 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-700 mt-2 flex-shrink-0" />
            <p className="text-xs text-gray-700 leading-relaxed">{reason}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfessionalAdjustmentCard({ data }: { data: NonNullable<DashboardData['professionalAdjustment']> }) {
  const professionalName = data.professionalName ?? 'Seu profissional'
  const hasDoseSuggestion = data.customDoseSuggestion !== null && data.customDoseSuggestion !== undefined

  return (
    <div className="bg-white rounded-lg border border-teal-100 p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">{hasDoseSuggestion ? 'Ajuste do profissional' : 'Orientacao do profissional'}</p>
          <h2 className="text-base font-semibold text-gray-900 leading-tight">{professionalName}</h2>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-teal-50 text-teal-800 border-teal-100 whitespace-nowrap">
          Ativo
        </span>
      </div>
      {hasDoseSuggestion && (
        <div className="rounded-lg bg-teal-50 border border-teal-100 p-3">
          <p className="text-xs text-teal-700 mb-1">Dose sugerida</p>
          <p className="text-xl font-semibold text-teal-900">
            {data.customDoseSuggestion} gota{data.customDoseSuggestion === 1 ? '' : 's'}
          </p>
        </div>
      )}
      {data.proNotes && (
        <p className="text-sm text-gray-700 leading-relaxed">{data.proNotes}</p>
      )}
      <p className="text-xs text-gray-500 leading-relaxed">
        {hasDoseSuggestion
          ? 'Este ajuste orienta o Plano de Hoje, exceto quando houver alerta de seguranca como semaforo vermelho ou palpitacoes.'
          : 'Esta orientacao fica registrada no seu acompanhamento e pode ser atualizada pelo profissional.'}
      </p>
    </div>
  )
}

function MiniBar({ value, color }: { value: number | null; color: string }) {
  const pct = value ? Math.round((value / 10) * 100) : 0
  return (
    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function NavBar({ showClinicAccess }: { showClinicAccess: boolean }) {
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
    ...(showClinicAccess ? [{
      label: 'Clinica', path: '/pro', icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 17V5.5A2.5 2.5 0 016.5 3h7A2.5 2.5 0 0116 5.5V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M2.5 17h15M10 6.5v5M7.5 9h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    }] : []),
    { label: 'Perfil', path: '/profile', icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )},
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200/70 z-50 shadow-[0_-8px_24px_rgba(15,23,42,0.04)]">
      <div className="max-w-lg mx-auto flex">
        {items.map((item) => {
          const active = pathname === item.path
          return (
            <button key={item.path} onClick={() => router.push(item.path)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                active ? 'text-teal-800' : 'text-gray-400 hover:text-gray-600'}`}>
              {item.icon}
              <span className={`text-xs ${active ? 'font-medium' : ''}`}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default function DashboardView({ data }: { data: DashboardData }) {
  const router = useRouter()
  const hasClinicAccess = data.isProfessional || data.plan === 'clinic'

  const days         = daysInProtocol(data.protocolStartDate)
  const cofactors    = COFACTORS_BY_PHASE[data.phase]
  const hasLogToday  = data.lastLog ? isToday(data.lastLog.log_date) : false
  const semaphore    = hasLogToday ? data.lastLog!.semaphore : 'green'
  const hasChartData = data.recentLogs.length >= 2
  const riskConfig   = RISK_LABELS[data.protocolRiskLevel]
  const nextExam     = parseExamSchedule(data.examSchedule)[0]
  const navigateRetention = (target: RetentionActionTarget) => {
    router.push(targetPath(target))
  }

  return (
    <div className="min-h-screen bg-[#F7FAF9] pb-24">

      {/* Header */}
      <div className="bg-teal-800 pt-12 pb-6 px-4">
        <div className="max-w-lg mx-auto">
          <p className="text-teal-100/80 text-sm mb-1">Olá,</p>
          <h1 className="text-white text-2xl font-semibold">{data.userName}</h1>
          <div className="mt-3 flex items-center gap-2">
            <span className="bg-white/10 text-teal-50 border border-white/10 text-xs font-medium px-3 py-1 rounded-full">
              {PHASE_LABELS[data.phase]}
            </span>
            <span className="bg-white/10 text-teal-50 border border-white/10 text-xs font-medium px-3 py-1 rounded-full">
              {data.drops === 0 ? 'Sem iodo — cofatores' : `${data.drops} gota${data.drops > 1 ? 's' : ''}/dia`}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        <CheckInCard
          data={data.patientRetention.checkIn}
          onNavigate={navigateRetention}
        />

        <NextActionsCard
          actions={data.patientRetention.nextActions}
          onNavigate={navigateRetention}
        />

        <ReminderRail
          reminders={data.patientRetention.reminders}
          onNavigate={navigateRetention}
        />

        <TodayPlanCard
          data={data.todayPlan}
          hasLogToday={hasLogToday}
          onRegister={() => router.push('/diary')}
        />

        {data.professionalAdjustment && (
          <ProfessionalAdjustmentCard data={data.professionalAdjustment} />
        )}

        <DoseExplanationCard data={data.patientInsights.doseExplanation} />

        <WeeklyGoalsCard data={data.patientInsights.weeklyGoals} />

        <ProtocolTimelineCard data={data.patientInsights.timeline} />

        <ProgressionReadinessCard
          data={data.progressionReadiness}
          onOpenProtocol={() => router.push('/protocol')}
        />

        <ProgressHistoryCard data={data.progressHistory} />

        {/* Semáforo */}
        <div className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm">
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

        <div className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Inteligencia do protocolo</p>
              <p className="text-xs text-gray-500 mt-1">{STRATEGY_LABELS[data.progressionStrategy]}</p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${riskConfig.tone}`}>
              {riskConfig.label}
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{riskConfig.note}</p>
          {data.protocolAlerts.length > 0 && (
            <div className="space-y-2">
              {data.protocolAlerts.slice(0, 2).map((alert) => (
                <div key={alert} className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <p className="text-xs text-amber-800 leading-relaxed">{alert}</p>
                </div>
              ))}
            </div>
          )}
          {nextExam && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Proximo monitoramento</p>
              <p className="text-sm text-gray-800 mt-1">{nextExam.label ?? 'Exame sugerido'}</p>
              <p className="text-xs text-gray-500 mt-0.5">{nextExam.timing ?? 'Conforme acompanhamento'}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => router.push('/protocol')}
            className="w-full rounded-lg border border-teal-200 text-teal-800 text-sm font-medium py-3 hover:bg-teal-50 transition-colors"
          >
            Ver guia do protocolo
          </button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Dose atual" value={data.drops === 0 ? '—' : data.drops}
            sub={data.drops === 0 ? 'sem iodo por ora' : `gota${data.drops > 1 ? 's' : ''} · ${(data.drops * 6.25).toFixed(1)}mg`} />
          <MetricCard label="Dias no protocolo" value={days}
            sub={days === 0 ? 'início hoje' : `dia${days > 1 ? 's' : ''} desde o início`} />
          <MetricCard label="Fase atual" value={data.phase} sub={PHASE_LABELS[data.phase]} />
          <MetricCard label="Cofatores" value={cofactors.length} sub="recomendados hoje" />
        </div>

        {/* Último registro */}
        {data.lastLog && (
          <div className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">
                {hasLogToday ? 'Registro de hoje' : `Último registro — ${new Date(data.lastLog.log_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
              </p>
              <span className="text-xs text-gray-400">{data.lastLog.dose_drops} gotas</span>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Energia', value: data.lastLog.energy,        color: 'bg-teal-500'   },
                { label: 'Humor',   value: data.lastLog.mood,          color: 'bg-indigo-400' },
                { label: 'Sono',    value: data.lastLog.sleep_quality, color: 'bg-sky-400'    },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-14">{label}</span>
                  <MiniBar value={value} color={color} />
                  <span className="text-xs font-medium text-gray-600 w-4 text-right">{value ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Análise IA */}
        <AnalysisCard
          logId={data.lastLog?.id ?? null}
          hasLog={hasLogToday}
          plan={data.plan}
          analyses={data.analysesUsed}
          limit={data.analysesLimit}
          window={data.analysesWindow}
        />

        {/* Evolução 7 dias */}
        <div className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-3">Evolução — 7 dias</p>
          {hasChartData ? (
            <div className="space-y-2">
              {data.recentLogs.map((log) => {
                const label = new Date(log.log_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })
                return (
                  <div key={log.log_date} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-8 capitalize">{label}</span>
                    <MiniBar value={log.energy}        color="bg-teal-500"   />
                    <MiniBar value={log.mood}          color="bg-indigo-400" />
                    <MiniBar value={log.sleep_quality} color="bg-sky-400"    />
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      log.semaphore === 'green' ? 'bg-emerald-500' : log.semaphore === 'yellow' ? 'bg-amber-400' : 'bg-red-500'}`} />
                  </div>
                )
              })}
              <div className="flex gap-3 mt-2 pt-2 border-t border-gray-50">
                {[['bg-teal-500','Energia'],['bg-indigo-400','Humor'],['bg-sky-400','Sono']].map(([color, label]) => (
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
                  <path d="M3 14l4-5 4 3 4-7" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm text-gray-500">Sem dados ainda</p>
              <p className="text-xs text-gray-400 mt-1">Faça pelo menos 2 registros para ver a evolução</p>
            </div>
          )}
        </div>

        {/* Cofatores */}
        <div className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-3">Cofatores de hoje</p>
          <div className="space-y-2">
            {cofactors.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md border border-teal-200 bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5.5L4 8L8.5 3" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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

        <p className="text-xs text-gray-400 text-center pb-2">
          Conteúdo educacional · Não substitui orientação médica profissional
        </p>
      </div>

      <NavBar showClinicAccess={hasClinicAccess} />
    </div>
  )
}
