'use client'

import { usePathname, useRouter } from 'next/navigation'
import type { ProData, ProPatientSummary } from './page'
import type { AlertLevel, PlanType, ProtocolPhase, SemaphoreColor } from '@/lib/supabase/types'

const PHASE_LABELS: Record<ProtocolPhase, string> = {
  '0': 'Pre-protocolo',
  '1': 'Fase 1',
  '2': 'Fase 2',
  '3': 'Fase 3',
  '4': 'Fase 4',
}

const PLAN_LABELS: Record<PlanType, string> = {
  free: 'Gratuito',
  pro: 'Pro',
  clinic: 'Clinica',
}

const ALERT_CONFIG: Record<AlertLevel, { label: string; dot: string; badge: string }> = {
  ok: {
    label: 'Estavel',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  },
  attention: {
    label: 'Atencao',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-800 border-amber-100',
  },
  urgent: {
    label: 'Urgente',
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-800 border-red-100',
  },
}

const SEMAPHORE_CONFIG: Record<SemaphoreColor, { label: string; dot: string; text: string }> = {
  green: { label: 'verde', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  yellow: { label: 'amarelo', dot: 'bg-amber-400', text: 'text-amber-700' },
  red: { label: 'vermelho', dot: 'bg-red-500', text: 'text-red-700' },
}

function initials(name: string | null, email: string) {
  const source = name?.trim() || email
  return source
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'IR'
}

function displayName(name: string | null, email: string) {
  return name?.trim() || email.split('@')[0] || 'Paciente'
}

function formatDate(date: string | null) {
  if (!date) return 'Sem registro'
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

function NavBar() {
  const router = useRouter()
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
    { label: 'Diario', path: '/diary', icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="7" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="7" y1="10" x2="13" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="7" y1="13" x2="10" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )},
    { label: 'Exames', path: '/exams', icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M6 2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 7h4M8 10h4M8 13h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )},
    { label: 'Pro', path: '/pro', icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2l2.2 4.6 5 .7-3.6 3.5.8 5-4.4-2.4-4.4 2.4.8-5L2.8 7.3l5-.7L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200/70 z-50 shadow-[0_-8px_24px_rgba(15,23,42,0.04)]">
      <div className="max-w-lg mx-auto flex">
        {items.map((item) => {
          const active = pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                active ? 'text-teal-800' : 'text-gray-400 hover:text-gray-600'
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

function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200/70 p-3 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-950 mt-1">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}

function PatientCard({ patient }: { patient: ProPatientSummary }) {
  const router = useRouter()
  const alert = ALERT_CONFIG[patient.alertLevel]
  const semaphore = patient.lastSemaphore ? SEMAPHORE_CONFIG[patient.lastSemaphore] : null
  const phase = patient.protocolPhase ? PHASE_LABELS[patient.protocolPhase] : 'Sem fase'

  return (
    <button
      onClick={() => router.push(`/pro/${patient.patientId}`)}
      className="w-full text-left bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm hover:border-teal-200 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center text-sm font-semibold flex-shrink-0">
          {initials(patient.patientName, patient.patientEmail)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-950 truncate">
                {displayName(patient.patientName, patient.patientEmail)}
              </p>
              <p className="text-xs text-gray-400 truncate">{patient.patientEmail}</p>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${alert.badge}`}>
              {alert.label}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-2">
              <p className="text-[11px] text-gray-400">Fase</p>
              <p className="text-xs font-medium text-gray-800 mt-0.5">{phase}</p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-2">
              <p className="text-[11px] text-gray-400">Dose</p>
              <p className="text-xs font-medium text-gray-800 mt-0.5">
                {patient.recommendedDoseDrops ?? '-'} gotas
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-2">
              <p className="text-[11px] text-gray-400">Dia</p>
              <p className="text-xs font-medium text-gray-800 mt-0.5">
                {patient.protocolDay ?? '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${semaphore?.dot ?? 'bg-gray-300'}`} />
              <span className={`text-xs ${semaphore?.text ?? 'text-gray-400'}`}>
                {semaphore ? `Semaforo ${semaphore.label}` : 'Sem registro recente'}
              </span>
            </div>
            <span className="text-xs text-gray-400">{formatDate(patient.lastLogDate)}</span>
          </div>

          {patient.proNotes && (
            <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-2 mt-3 line-clamp-2">
              {patient.proNotes}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

function EmptyState({ hasProfessionalProfile }: { hasProfessionalProfile: boolean }) {
  const router = useRouter()

  return (
    <div className="bg-white rounded-lg border border-gray-200/70 p-6 shadow-sm text-center">
      <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center mx-auto mb-3">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      </div>
      <p className="text-sm font-semibold text-gray-900">
        {hasProfessionalProfile ? 'Nenhum paciente vinculado ainda' : 'Perfil profissional pendente'}
      </p>
      <p className="text-xs text-gray-500 leading-relaxed mt-1">
        {hasProfessionalProfile
          ? 'Os proximos passos sao convite, aceite do paciente e acompanhamento individual.'
          : 'Sua conta tem acesso Pro, mas ainda nao existe um registro profissional associado a ela.'}
      </p>
      <button
        onClick={() => router.push('/pro/invite')}
        disabled={!hasProfessionalProfile}
        className={`mt-4 w-full py-2.5 rounded-lg text-sm font-medium transition-all ${
          hasProfessionalProfile
            ? 'bg-teal-800 hover:bg-teal-900 text-white'
            : 'bg-gray-50 text-gray-400 border border-gray-100 cursor-not-allowed'
        }`}
      >
        Convidar paciente
      </button>
    </div>
  )
}

export default function ProView({ data }: { data: ProData }) {
  const router = useRouter()
  const activePatients = data.patients.filter((patient) => patient.status === 'active').length
  const urgentPatients = data.patients.filter((patient) => patient.alertLevel === 'urgent').length
  const attentionPatients = data.patients.filter((patient) => patient.alertLevel === 'attention').length
  const redToday = data.patients.filter((patient) => patient.lastSemaphore === 'red').length
  const displayProfessionalName = data.professional?.displayName || data.user.fullName || 'Profissional'
  const planLabel = data.user.isProfessional || data.user.plan === 'clinic' ? 'Clinica' : PLAN_LABELS[data.user.plan]
  const slotsUsed = data.professional
    ? `${data.patients.length}/${data.professional.patientLimit}`
    : '0/0'

  return (
    <div className="min-h-screen bg-[#F7FAF9] pb-24">
      <div className="bg-teal-800 pt-12 pb-6 px-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-teal-100/80 text-sm mb-1">Painel profissional</p>
              <h1 className="text-white text-2xl font-semibold">{displayProfessionalName}</h1>
              <p className="text-teal-100/80 text-sm mt-1">
                {data.professional?.specialty || 'Acompanhamento clinico do protocolo'}
              </p>
            </div>
            <span className="bg-white/10 text-teal-50 border border-white/10 text-xs font-medium px-3 py-1 rounded-full">
              {planLabel}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-center">
              <p className="text-2xl font-semibold text-white">{activePatients}</p>
              <p className="text-xs text-teal-100/80">ativos</p>
            </div>
            <div className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-center">
              <p className="text-2xl font-semibold text-red-300">{urgentPatients}</p>
              <p className="text-xs text-teal-100/80">urgentes</p>
            </div>
            <div className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-center">
              <p className="text-2xl font-semibold text-amber-200">{attentionPatients}</p>
              <p className="text-xs text-teal-100/80">atencao</p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Capacidade" value={slotsUsed} sub="pacientes vinculados" />
          <StatCard label="Semaforo vermelho" value={redToday} sub="ultimo registro" />
        </div>

        <section className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Fila clinica</h2>
              <p className="text-xs text-gray-500 mt-1">Prioridade por alerta e registro mais recente.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/pro/invite')}
                disabled={!data.professional}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-900 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-white transition-all"
              >
                Convidar
              </button>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                data.professional?.isVerified
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-100'
              }`}>
                {data.professional?.isVerified ? 'Verificado' : 'Em revisao'}
              </span>
            </div>
          </div>
        </section>

        {data.patients.length > 0 ? (
          <div className="space-y-3">
            {data.patients.map((patient) => (
              <PatientCard key={patient.patientId} patient={patient} />
            ))}
          </div>
        ) : (
          <EmptyState hasProfessionalProfile={Boolean(data.professional)} />
        )}

        <section className="bg-slate-900 rounded-lg p-4 text-white">
          <p className="text-sm font-semibold">Proximas entregas</p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {['Convites', 'Notas clinicas', 'Upload de laudos', 'Visao do paciente'].map((item) => (
              <div key={item} className="rounded-lg bg-white/10 border border-white/10 p-2">
                <p className="text-xs text-slate-100">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <NavBar />
    </div>
  )
}
