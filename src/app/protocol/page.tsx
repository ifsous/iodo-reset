import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Json, ProgressionStrategy, ProtocolPhase, ProtocolRiskLevel } from '@/lib/supabase/types'

export const metadata = {
  title: 'Guia do protocolo - IODO RESET',
}

const PHASE_LABELS: Record<ProtocolPhase, string> = {
  '0': 'Pre-protocolo',
  '1': 'Fase 1 - Ativacao',
  '2': 'Fase 2 - Progressao',
  '3': 'Fase 3 - Detox',
  '4': 'Fase 4 - Estabilizacao',
}

const RISK_LABELS: Record<ProtocolRiskLevel, { label: string; tone: string; note: string }> = {
  standard: {
    label: 'Padrao',
    tone: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    note: 'Acompanhe sintomas, cofatores e exames para manter uma progressao consistente.',
  },
  caution: {
    label: 'Conservador',
    tone: 'bg-amber-50 text-amber-800 border-amber-100',
    note: 'O foco e preparar base, observar tolerancia e evitar aumento automatico de dose.',
  },
  professional_only: {
    label: 'Somente com profissional',
    tone: 'bg-red-50 text-red-800 border-red-100',
    note: 'Nao inicie, suba ou retome dose sem acompanhamento profissional.',
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
  priority?: string
}

type ProfileRow = {
  phase: ProtocolPhase
  recommended_dose_drops: number
  conditions: string[]
  cofactors_in_use: string[]
  safety_flags: string[]
  halogen_exposure: string[]
  protocol_risk_level: ProtocolRiskLevel
  progression_strategy: ProgressionStrategy
  protocol_alerts: string[]
  exam_schedule: Json
}

function parseExamSchedule(value: Json): ExamScheduleItem[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is Record<string, Json | undefined> => item !== null && typeof item === 'object' && !Array.isArray(item))
    .map((item) => ({
      key: typeof item.key === 'string' ? item.key : undefined,
      label: typeof item.label === 'string' ? item.label : undefined,
      timing: typeof item.timing === 'string' ? item.timing : undefined,
      priority: typeof item.priority === 'string' ? item.priority : undefined,
    }))
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-950 mb-3">{title}</h2>
      {children}
    </section>
  )
}

function Pill({ children, className = 'bg-slate-50 text-slate-700 border-slate-200' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full border ${className}`}>
      {children}
    </span>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item} className="flex gap-2">
          <div className="w-5 h-5 rounded-md bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5.2L4 7.6L8.5 2.8" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
        </div>
      ))}
    </div>
  )
}

function BottomNav() {
  const items = [
    { label: 'Dashboard', path: '/dashboard', icon: 'grid' },
    { label: 'Diario', path: '/diary', icon: 'diary' },
    { label: 'Exames', path: '/exams', icon: 'plus' },
    { label: 'Perfil', path: '/profile', icon: 'user' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200/70 z-50 shadow-[0_-8px_24px_rgba(15,23,42,0.04)]">
      <div className="max-w-lg mx-auto flex">
        {items.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {item.icon === 'grid' && (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="11" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="2" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="11" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            )}
            {item.icon === 'diary' && (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="7" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="7" y1="10" x2="13" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="7" y1="13" x2="10" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
            {item.icon === 'plus' && (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            )}
            {item.icon === 'user' && (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

export default async function ProtocolPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('onboarding_done')
    .eq('id', user.id)
    .single<{ onboarding_done: boolean }>()

  if (!userData?.onboarding_done) redirect('/onboarding')

  const { data: profile } = await supabase
    .from('profiles')
    .select('phase, recommended_dose_drops, conditions, cofactors_in_use, safety_flags, halogen_exposure, protocol_risk_level, progression_strategy, protocol_alerts, exam_schedule')
    .eq('user_id', user.id)
    .single<ProfileRow>()

  if (!profile) redirect('/onboarding')

  const risk = RISK_LABELS[profile.protocol_risk_level ?? 'standard']
  const examSchedule = parseExamSchedule(profile.exam_schedule)
  const doseMg = ((profile.recommended_dose_drops ?? 0) * 6.25).toFixed(1)
  const missingCoreCofactors = ['selenio', 'magnesio'].filter((item) => !profile.cofactors_in_use?.includes(item))
  const hasHalogenLoad = (profile.halogen_exposure ?? []).filter((item) => item !== 'unknown').length >= 2

  return (
    <div className="min-h-screen bg-[#F7FAF9] pb-24">
      <header className="bg-teal-800 pt-12 pb-6 px-4">
        <div className="max-w-lg mx-auto">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-teal-100/80 mb-4">
            <span aria-hidden="true">‹</span>
            Dashboard
          </Link>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-teal-100/80 text-sm mb-1">Guia educativo</p>
              <h1 className="text-white text-2xl font-semibold">Protocolo IODO RESET</h1>
            </div>
            <Pill className={risk.tone}>{risk.label}</Pill>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="bg-white/10 border border-white/10 rounded-lg p-3">
              <p className="text-xs text-teal-100/80">Fase atual</p>
              <p className="text-sm font-semibold text-white mt-1">{PHASE_LABELS[profile.phase]}</p>
            </div>
            <div className="bg-white/10 border border-white/10 rounded-lg p-3">
              <p className="text-xs text-teal-100/80">Dose calculada</p>
              <p className="text-sm font-semibold text-white mt-1">
                {profile.recommended_dose_drops === 0 ? 'Sem iodo por ora' : `${profile.recommended_dose_drops} gotas - ${doseMg}mg`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <Section title="Sua estrategia">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Pill className="bg-teal-50 text-teal-800 border-teal-100">{STRATEGY_LABELS[profile.progression_strategy]}</Pill>
              <Pill className={risk.tone}>{risk.label}</Pill>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{risk.note}</p>
            {profile.protocol_alerts.length > 0 && (
              <div className="space-y-2">
                {profile.protocol_alerts.map((alert) => (
                  <div key={alert} className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <p className="text-xs text-amber-800 leading-relaxed">{alert}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section title="Base antes de progressao">
          <BulletList
            items={[
              'Selenio e magnesio sao tratados como base de seguranca no app antes de progressao.',
              'Vitamina C, vitaminas B2 + B3, vitamina D3 + K2, agua e sal integral entram como suporte de tolerancia.',
              'Semaforo amarelo ou vermelho pede manutencao, reducao ou pausa educacional, nunca aumento automatico.',
            ]}
          />
          {missingCoreCofactors.length > 0 && (
            <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-800 leading-relaxed">
                No seu cadastro, a base de {missingCoreCofactors.join(' e ')} ainda nao aparece como ativa.
              </p>
            </div>
          )}
        </Section>

        <Section title="Orientacao alimentar">
          <BulletList
            items={[
              'Priorize comida de verdade: proteinas, vegetais, frutas, gorduras boas e fontes minerais, evitando base alimentar ultraprocessada.',
              'Use sal integral ou nao refinado conforme tolerancia e orientacao individual; sal iodado refinado sozinho nao e tratado como base suficiente no protocolo.',
              'Inclua fontes alimentares de iodo quando fizer sentido, como peixes, frutos do mar e algas com prudencia, porque o teor de iodo pode variar muito.',
              'Reduza exposicao alimentar a halogenios: excesso de ultraprocessados, panificados industrializados, agua muito fluoretada e fontes recorrentes de cloro/bromo.',
              'Se a alimentacao for vegana, vegetariana ou muito restritiva, acompanhe exames e cofatores com mais cuidado, pois a ingestao de iodo e minerais pode ficar baixa.',
            ]}
          />
          <div className="mt-3 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
            <p className="text-xs text-teal-800 leading-relaxed">
              A meta alimentar no IODO RESET e sustentar tolerancia: hidratacao, sal conforme tolerancia, cofatores e menor carga de competidores do iodo.
            </p>
          </div>
        </Section>

        <Section title="Sinais que pedem cautela">
          <BulletList
            items={[
              'Palpitacoes, piora importante de ansiedade, pressao alta, sintomas intensos ou semaforo vermelho pedem pausa e avaliacao.',
              'Graves, hipertireoidismo ativo, gravidez, amamentacao, doenca renal ou uso de antitireoidiano exigem acompanhamento profissional.',
              'Hashimoto e uso de medicamento tireoidiano pedem progressao mais lenta e monitoramento laboratorial.',
            ]}
          />
        </Section>

        <Section title="Halogenios e ambiente">
          <BulletList
            items={[
              'Fluor, bromo e cloro podem competir com o iodo no contexto educativo do protocolo.',
              'O app usa sua exposicao declarada para reforcar hidratacao, sal conforme tolerancia, cofatores e observacao diaria.',
              'A meta nao e alarmar, mas reduzir carga desnecessaria e acompanhar tolerancia com dados.',
            ]}
          />
          {hasHalogenLoad && (
            <div className="mt-3 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">
              <p className="text-xs text-sky-800 leading-relaxed">
                Seu perfil indica exposicao relevante a halogenios; acompanhe sintomas e cofatores com mais consistencia.
              </p>
            </div>
          )}
        </Section>

        <Section title="Monitoramento laboratorial">
          {examSchedule.length > 0 ? (
            <div className="space-y-3">
              {examSchedule.map((exam, index) => (
                <div key={exam.key ?? `${exam.label}-${index}`} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                  <p className="text-sm font-medium text-gray-900">{exam.label ?? 'Exame sugerido'}</p>
                  <p className="text-xs text-gray-500 mt-1">{exam.timing ?? 'Conforme acompanhamento'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhum monitoramento sugerido ainda.</p>
          )}
          <Link
            href="/exams"
            className="mt-4 w-full inline-flex items-center justify-center rounded-lg border border-teal-200 text-teal-800 text-sm font-medium py-3 hover:bg-teal-50 transition-colors"
          >
            Abrir exames
          </Link>
        </Section>

        <p className="text-xs text-gray-400 text-center pb-2">
          Conteudo educacional. Nao substitui diagnostico, prescricao ou acompanhamento profissional.
        </p>
      </main>

      <BottomNav />
    </div>
  )
}
