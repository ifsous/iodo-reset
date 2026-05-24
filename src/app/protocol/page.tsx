import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buildProtocolIntelligence, type PatientNeedTone, type ProtocolStepStatus } from '@/lib/protocol/protocol-intelligence'
import type { Json, ProgressionStrategy, ProtocolPhase, ProtocolRiskLevel, SymptomType } from '@/lib/supabase/types'

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

const EDUCATIONAL_PHASES: Array<{
  phase: ProtocolPhase
  label: string
  purpose: string
  focus: string[]
  avoid: string[]
  progress: string
}> = [
  {
    phase: '0',
    label: 'Pre-protocolo - Base e tolerancia',
    purpose: 'Preparar o corpo antes de usar iodo ou antes de qualquer aumento. Esta fase reduz improviso e organiza cofatores, sintomas e exames.',
    focus: [
      'Completar cofatores centrais, especialmente selenio e magnesio, conforme tolerancia individual.',
      'Registrar energia, sono, humor, sintomas, agua, sal e suplementos por alguns dias.',
      'Revisar historico tireoidiano, medicamentos, gravidez, amamentacao e sinais de risco.',
    ],
    avoid: [
      'Iniciar dose alta sem saber como estao sintomas, cofatores e exames.',
      'Usar iodo para compensar cansaço, ansiedade ou ganho de peso sem avaliacao.',
      'Ignorar palpitacoes, tremor, piora importante de ansiedade ou pressao alta.',
    ],
    progress: 'Avance apenas quando a base estiver consistente e o semaforo estiver estavel.',
  },
  {
    phase: '1',
    label: 'Fase 1 - Ativacao',
    purpose: 'Introduzir ou manter uma dose baixa com foco em observar resposta. O objetivo nao e acelerar, e entender tolerancia.',
    focus: [
      'Manter registro diario e conferir se o semaforo permanece verde.',
      'Priorizar hidratacao, sal conforme tolerancia e cofatores todos os dias.',
      'Observar pele, intestino, sono, energia, humor e sinais cardiovasculares.',
    ],
    avoid: [
      'Aumentar dose em dias de sono ruim, estresse intenso ou sintomas novos.',
      'Confundir reacao intensa com sinal de que precisa subir mais rapido.',
      'Usar algas ou kelp em paralelo sem saber o teor de iodo.',
    ],
    progress: 'Considere progressao somente com boa tolerancia, cofatores consistentes e ausencia de sinais de alerta.',
  },
  {
    phase: '2',
    label: 'Fase 2 - Progressao',
    purpose: 'Ajustar gradualmente quando a resposta esta previsivel. A fase depende mais de estabilidade do que de calendario.',
    focus: [
      'Comparar tendencia semanal de energia, sono, humor e sintomas.',
      'Usar exames e historico para decidir se faz sentido manter, pausar ou ajustar.',
      'Evitar multiplas mudancas ao mesmo tempo para conseguir entender causa e efeito.',
    ],
    avoid: [
      'Subir dose em semaforo amarelo ou vermelho.',
      'Mudar iodo, cofatores, dieta e treino no mesmo dia e perder rastreabilidade.',
      'Seguir progressao padrao se o perfil foi marcado como conservador ou supervisionado.',
    ],
    progress: 'A dose so deve subir quando a tendencia recente confirma tolerancia.',
  },
  {
    phase: '3',
    label: 'Fase 3 - Detox e acompanhamento proximo',
    purpose: 'Fase de maior atencao a sintomas e carga de halogenios. No app, detox significa monitorar tolerancia, nao forcar reacoes.',
    focus: [
      'Acompanhar sintomas com mais rigor e reduzir carga desnecessaria de competidores do iodo.',
      'Reforcar agua, sal conforme tolerancia, vitamina C e cofatores combinados.',
      'Usar profissional de referencia quando houver Hashimoto, Graves, nodulos, medicacao tireoidiana ou sintomas fortes.',
    ],
    avoid: [
      'Interpretar piora intensa como etapa obrigatoria.',
      'Insistir em dose quando aparecem palpitacoes, ansiedade forte, tremor ou piora importante.',
      'Fazer protocolos paralelos agressivos sem monitoramento.',
    ],
    progress: 'Esta fase pede manutencao ou reducao sempre que a resposta ficar instavel.',
  },
  {
    phase: '4',
    label: 'Fase 4 - Estabilizacao',
    purpose: 'Manter ganhos, simplificar rotina e revisar necessidade real de continuidade. O foco passa a ser sustentacao.',
    focus: [
      'Revisar exames, sintomas e rotina para decidir manutencao.',
      'Manter cofatores essenciais e reduzir complexidade quando possivel.',
      'Usar dados do historico para evitar retorno automatico a dose maior.',
    ],
    avoid: [
      'Manter dose alta por habito sem revisar sinais e exames.',
      'Parar todos os cofatores ao mesmo tempo se eles sustentaram tolerancia.',
      'Ignorar mudancas de contexto como gravidez, novos medicamentos ou sintomas tireoidianos.',
    ],
    progress: 'A estabilidade deve ser reavaliada periodicamente, especialmente se surgirem sintomas novos.',
  },
]

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
  medications: string[]
  current_symptoms: SymptomType[]
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

function PhaseEducationCard({
  item,
  current,
}: {
  item: (typeof EDUCATIONAL_PHASES)[number]
  current: boolean
}) {
  return (
    <article className={`rounded-lg border p-4 space-y-3 ${current ? 'bg-teal-50 border-teal-100' : 'bg-slate-50 border-gray-100'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Fase {item.phase}</p>
          <h3 className="text-sm font-semibold text-gray-950 leading-tight">{item.label}</h3>
        </div>
        {current && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-white text-teal-800 border-teal-100 whitespace-nowrap">
            Atual
          </span>
        )}
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{item.purpose}</p>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Foco</p>
        <BulletList items={item.focus} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Evitar</p>
        <BulletList items={item.avoid} />
      </div>
      <div className="rounded-lg bg-white/80 border border-gray-100 px-3 py-2">
        <p className="text-xs text-gray-700 leading-relaxed">{item.progress}</p>
      </div>
    </article>
  )
}

const NEED_TONES: Record<PatientNeedTone, string> = {
  safety: 'bg-red-50 text-red-800 border-red-100',
  foundation: 'bg-teal-50 text-teal-800 border-teal-100',
  metabolic: 'bg-sky-50 text-sky-800 border-sky-100',
  detox: 'bg-amber-50 text-amber-800 border-amber-100',
  monitoring: 'bg-indigo-50 text-indigo-800 border-indigo-100',
  maintenance: 'bg-emerald-50 text-emerald-800 border-emerald-100',
}

const STEP_TONES: Record<ProtocolStepStatus, { dot: string; badge: string; label: string; row: string }> = {
  done: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    label: 'feito',
    row: 'bg-emerald-50/40 border-emerald-100',
  },
  current: {
    dot: 'bg-teal-700',
    badge: 'bg-teal-50 text-teal-800 border-teal-100',
    label: 'agora',
    row: 'bg-teal-50 border-teal-100',
  },
  next: {
    dot: 'bg-sky-500',
    badge: 'bg-sky-50 text-sky-800 border-sky-100',
    label: 'proximo',
    row: 'bg-slate-50 border-gray-100',
  },
  blocked: {
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-800 border-red-100',
    label: 'bloqueado',
    row: 'bg-red-50/50 border-red-100',
  },
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
    .select('phase, recommended_dose_drops, conditions, medications, current_symptoms, cofactors_in_use, safety_flags, halogen_exposure, protocol_risk_level, progression_strategy, protocol_alerts, exam_schedule')
    .eq('user_id', user.id)
    .single<ProfileRow>()

  if (!profile) redirect('/onboarding')

  const risk = RISK_LABELS[profile.protocol_risk_level ?? 'standard']
  const examSchedule = parseExamSchedule(profile.exam_schedule)
  const doseMg = ((profile.recommended_dose_drops ?? 0) * 6.25).toFixed(1)
  const missingCoreCofactors = ['selenio', 'magnesio'].filter((item) => !profile.cofactors_in_use?.includes(item))
  const hasHalogenLoad = (profile.halogen_exposure ?? []).filter((item) => item !== 'unknown').length >= 2
  const intelligence = buildProtocolIntelligence({
    phase: profile.phase,
    riskLevel: profile.protocol_risk_level ?? 'standard',
    progressionStrategy: profile.progression_strategy ?? 'standard',
    recommendedDrops: profile.recommended_dose_drops,
    conditions: profile.conditions ?? [],
    symptoms: profile.current_symptoms ?? [],
    medications: profile.medications ?? [],
    cofactorsInUse: profile.cofactors_in_use ?? [],
    safetyFlags: profile.safety_flags ?? [],
    halogenExposure: profile.halogen_exposure ?? [],
    protocolAlerts: profile.protocol_alerts ?? [],
    recentSignals: {
      redDays: 0,
      yellowDays: 0,
      hasPalpitations: false,
      cofactorReadyDays: 0,
      loggedDays: 0,
    },
  })

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
            <Link
              href="/protocol/history"
              className="block rounded-lg border border-teal-200 bg-white px-3 py-3 text-center text-sm font-medium text-teal-800 transition-colors hover:bg-teal-50"
            >
              Ver historico de fase e dose
            </Link>
          </div>
        </Section>

        <Section title="Framework inteligente">
          <div className="space-y-4">
            <div className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-3">
              <p className="text-sm font-semibold text-teal-950">{intelligence.currentStage.label}</p>
              <p className="text-xs text-teal-900/80 leading-relaxed mt-1">{intelligence.currentStage.detail}</p>
              <p className="text-sm font-medium text-teal-900 mt-3">{intelligence.nextBestAction}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Necessidades do seu perfil</p>
              <div className="space-y-2">
                {intelligence.needs.map((need) => (
                  <div key={need.key} className={`rounded-lg border px-3 py-2 ${NEED_TONES[need.tone]}`}>
                    <p className="text-xs font-semibold">{need.title}</p>
                    <p className="text-xs leading-relaxed mt-0.5 opacity-85">{need.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Sistema progressivo em 5 etapas</p>
              <div className="space-y-2">
                {intelligence.steps.map((step) => {
                  const style = STEP_TONES[step.status]
                  return (
                    <div key={step.number} className={`rounded-lg border px-3 py-3 ${style.row}`}>
                      <div className="flex items-start gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-gray-900">{step.number}. {step.title}</p>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${style.badge}`}>
                              {style.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed mt-1">{step.explanation}</p>
                          <p className="text-xs font-medium text-gray-700 leading-relaxed mt-2">{step.patientAction}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Fases do protocolo">
          <div className="space-y-3">
            <p className="text-sm text-gray-700 leading-relaxed">
              As fases ajudam a organizar decisao e observacao. Elas nao sao uma corrida: sinais recentes, exames, cofatores e risco individual sempre pesam mais que calendario.
            </p>
            {EDUCATIONAL_PHASES.map((item) => (
              <PhaseEducationCard key={item.phase} item={item} current={item.phase === profile.phase} />
            ))}
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

        <Section title="O que evitar durante o protocolo">
          <BulletList
            items={[
              'Aumentar dose quando houver palpitacoes, tremor, ansiedade forte, pressao elevada, insonia marcante ou semaforo vermelho.',
              'Combinar varias fontes de iodo sem rastrear quantidade total, especialmente kelp, algas, Lugol e multivitaminicos.',
              'Usar doses acima de limites nutricionais como rotina sem profissional e sem monitoramento laboratorial.',
              'Ignorar medicamentos tireoidianos, antitireoidianos, amiodarona, litio ou historico de hipertireoidismo.',
              'Tratar o app como diagnostico. O app organiza dados e educacao; decisao clinica sensivel precisa de profissional.',
            ]}
          />
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

        <Section title="Referencias de seguranca">
          <div className="space-y-3">
            <p className="text-sm text-gray-700 leading-relaxed">
              O iodo e essencial para hormonios tireoidianos, mas excesso ou uso sem contexto pode piorar quadros tireoidianos em pessoas suscetiveis. Por isso o app separa educacao, registro e acompanhamento profissional.
            </p>
            <div className="space-y-2">
              <a
                href="https://ods.od.nih.gov/factsheets/Iodine-HealthProfessional/"
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg border border-gray-100 bg-slate-50 px-3 py-2 text-sm text-teal-800 font-medium hover:bg-teal-50"
              >
                NIH ODS - Iodine Fact Sheet
              </a>
              <a
                href="https://www.thyroid.org/ata-statement-on-the-potential-risks-of-excess-iodine-ingestion-and-exposure/"
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg border border-gray-100 bg-slate-50 px-3 py-2 text-sm text-teal-800 font-medium hover:bg-teal-50"
              >
                American Thyroid Association - riscos de excesso de iodo
              </a>
            </div>
          </div>
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
