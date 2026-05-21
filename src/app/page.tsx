import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const FEATURES = [
  {
    title: 'Onboarding clinico',
    text: 'Cinco etapas para mapear sintomas, historico, medicamentos, objetivos, cautelas e ponto de partida do protocolo.',
  },
  {
    title: 'Diario com semaforo',
    text: 'Registre dose, energia, humor, sono, sintomas e cofatores para saber quando continuar, observar ou pausar.',
  },
  {
    title: 'Exames organizados',
    text: 'Acompanhe marcadores laboratoriais, status de referencia e interpretacoes educacionais no contexto do protocolo.',
  },
  {
    title: 'IA educacional',
    text: 'Receba leituras claras sobre diario e exames, com linguagem segura e sem substituir avaliacao profissional.',
  },
  {
    title: 'Guia de cofatores',
    text: 'Veja selenio, magnesio, vitamina C, B2/B3, hidratacao e sal integral dentro de uma rotina acompanhavel.',
  },
  {
    title: 'Perfil profissional',
    text: 'Profissionais podem acompanhar pacientes, enviar notas e visualizar progresso com mais contexto clinico.',
  },
]

const OUTCOMES = [
  'Menos achismo na evolucao da dose',
  'Mais clareza sobre sintomas e cofatores',
  'Historico pronto para conversar com profissionais',
  'Protocolos individualizados por cautela e objetivo',
]

const STEPS = [
  {
    title: 'Configure o perfil',
    text: 'O paciente informa sintomas, objetivo, condicoes, medicamentos, exames e sinais de atencao.',
  },
  {
    title: 'Receba uma rota inicial',
    text: 'O app organiza fase, dose, cofatores e alertas para iniciar com mais prudencia.',
  },
  {
    title: 'Acompanhe a resposta',
    text: 'Diario, exames, IA e semaforo ajudam a entender a evolucao real ao longo dos dias.',
  },
]

const FAQ = [
  {
    q: 'O IODO RESET prescreve tratamento?',
    a: 'Nao. O app oferece organizacao, educacao e acompanhamento de dados. Decisoes clinicas devem ser feitas com profissional de saude.',
  },
  {
    q: 'Serve para quem esta com Hashimoto ou usa remedio de tireoide?',
    a: 'O app identifica esses cenarios como cautela e orienta progressao conservadora, cofatores e monitoramento. Em casos sensiveis, acompanhamento profissional e essencial.',
  },
  {
    q: 'Posso usar apenas no plano gratuito?',
    a: 'Sim. O plano gratuito permite iniciar o protocolo e testar recursos essenciais. Recursos avancados e mais analises de IA ficam no plano Pro.',
  },
]

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.2L6.4 11.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
      <path d="M3.5 8.5h9M9.5 4.5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ProductPanel() {
  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <div className="absolute -inset-6 rounded-[2rem] bg-cyan-200/35 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-cyan-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-[#F7FBFC] px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-300" />
            <span className="h-3 w-3 rounded-full bg-amber-300" />
            <span className="h-3 w-3 rounded-full bg-emerald-300" />
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Semaforo verde
          </span>
        </div>

        <div className="grid gap-0 md:grid-cols-[0.78fr_1.22fr]">
          <aside className="border-b border-slate-100 bg-[#F1FAF9] p-5 md:border-b-0 md:border-r">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">Hoje</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">Fase 1</h3>
            <p className="mt-1 text-sm text-slate-600">4 gotas - 25.0mg</p>

            <div className="mt-5 rounded-xl border border-teal-100 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">Protocolo atual</p>
              <div className="mt-3 space-y-3">
                {[
                  ['Dose', '25.0mg'],
                  ['Dias', '12'],
                  ['Cofatores', '5/6'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-semibold text-slate-950">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div className="p-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Energia', '8'],
                ['Humor', '7'],
                ['Sono', '8'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <p className="text-sm font-semibold text-slate-950">Continuar protocolo</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Sua tolerancia esta boa. Mantenha cofatores e observe sintomas antes de qualquer progressao.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-[#F8FCFC] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">IA educacional</p>
                <p className="mt-2 text-sm text-slate-700">Analise do diario e exames no contexto do protocolo.</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-[#F8FCFC] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Exames</p>
                <p className="mt-2 text-sm text-slate-700">18 marcadores para acompanhar com historico.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const code = params?.code

  if (typeof code === 'string' && code.trim()) {
    const callbackParams = new URLSearchParams()
    callbackParams.set('code', code)

    const next = params?.next
    callbackParams.set('next', typeof next === 'string' ? next : '/profile/reset-password?mode=recovery')

    redirect(`/auth/callback?${callbackParams.toString()}`)
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className="border-b border-slate-100 bg-[#F7FBFC]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-2 text-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckIcon />
            </span>
            <span>Plataforma educacional com privacidade, seguranca e dados organizados</span>
          </div>
          <Link href="/login" className="hidden font-semibold text-teal-800 hover:text-teal-950 sm:inline">
            Entrar no app
          </Link>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-700 font-bold text-white">IR</span>
            <span className="font-semibold tracking-tight text-slate-950">IODO RESET</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-semibold text-slate-700 md:flex">
            <a href="#funcionalidades" className="hover:text-teal-800">Funcionalidades</a>
            <a href="#framework" className="hover:text-teal-800">Framework</a>
            <a href="#profissionais" className="hover:text-teal-800">Profissionais</a>
            <a href="#faq" className="hover:text-teal-800">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-semibold text-slate-700 hover:text-teal-800 sm:inline">
              Entrar
            </Link>
            <Link href="/login?mode=signup" className="inline-flex items-center justify-center rounded-lg border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800 transition-colors hover:bg-teal-50">
              Comecar gratis
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#F3FBFD] via-white to-[#EAF8F4]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 md:grid-cols-[0.95fr_1.05fr] md:py-20">
          <div>
            <p className="inline-flex border-b-2 border-amber-400 pb-1 text-base font-semibold text-teal-800">
              App para protocolo de iodo assistido por dados
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[1.03] tracking-tight text-[#1970C8] md:text-6xl">
              Suplementacao de iodo com mais clareza, rotina e acompanhamento.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-700">
              O IODO RESET organiza perfil clinico, dose, cofatores, sintomas, exames e IA educacional em uma experiencia simples para pacientes e profissionais.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login?mode=signup" className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-400 px-6 py-4 font-semibold text-slate-950 shadow-lg shadow-amber-300/30 transition-colors hover:bg-amber-300">
                Quero comecar gratuitamente
                <ArrowIcon />
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center rounded-lg px-6 py-4 font-semibold text-teal-800 transition-colors hover:bg-teal-50">
                Ja tenho acesso
              </Link>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {OUTCOMES.map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-50 text-emerald-700">
                    <CheckIcon />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <ProductPanel />
        </div>
      </section>

      <section className="relative z-10 -mt-4 px-5 md:-mt-10">
        <div className="mx-auto grid max-w-6xl gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl shadow-slate-200/60 md:grid-cols-3">
          {[
            ['6', 'analises de IA no plano gratuito'],
            ['5', 'etapas de onboarding clinico'],
            ['18', 'tipos de exames para acompanhar'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-xl bg-[#F7FBFC] p-5">
              <p className="text-4xl font-semibold text-teal-800">{value}</p>
              <p className="mt-1 text-sm text-slate-600">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="funcionalidades" className="mx-auto max-w-7xl px-5 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Funcionalidades</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            Tudo que o paciente precisa para acompanhar o protocolo em um so lugar.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="group rounded-xl bg-[#2386D9] p-6 text-white shadow-lg shadow-blue-100 transition-transform hover:-translate-y-1">
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-lg bg-white/15 text-white">
                <CheckIcon />
              </div>
              <h3 className="text-xl font-semibold">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/86">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="framework" className="border-y border-slate-100 bg-[#F7FBFC]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[0.82fr_1.18fr] lg:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Framework do protocolo</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Uma jornada personalizada para cada necessidade do paciente.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-650">
              Em vez de seguir uma dose isolada, o app cruza seguranca, perfil clinico, exames, exposicao a halogenios, cofatores e sintomas diarios para orientar uma evolucao mais consciente.
            </p>

            <div className="mt-8 space-y-3">
              {[
                ['Cansaco e nevoa mental', 'Energia, sono, humor e cofatores antes de sugerir evolucao.'],
                ['Tireoide e autoimunidade', 'Triagem, exames, cautela e acompanhamento profissional.'],
                ['Reacoes iniciais', 'Hidratacao, sal, pausa, reducao e reavaliacao quando necessario.'],
                ['Manutencao', 'Alimentacao, exposicao ambiental, dose estavel e historico.'],
              ].map(([title, text]) => (
                <div key={title} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white">
                    <CheckIcon />
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-950">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <figure className="relative mx-auto w-full max-w-[610px] overflow-hidden rounded-2xl border border-cyan-100 bg-white p-2 shadow-2xl shadow-cyan-100/80">
            <Image
              src="/iodo-reset-framework.png"
              alt="Framework IODO RESET com sete etapas: triagem, perfil, exames, halogenios, cofatores, fase e monitoramento."
              width={1080}
              height={1920}
              sizes="(max-width: 1024px) 100vw, 610px"
              className="h-auto w-full rounded-xl"
            />
          </figure>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:py-24">
        <div className="grid items-start gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Como funciona</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              Da primeira resposta ao acompanhamento diario.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <article key={step.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-700 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-6 text-lg font-semibold text-slate-950">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="profissionais" className="bg-[#0D6F68] text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 md:grid-cols-[1fr_0.82fr] md:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">Pacientes e profissionais</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Mais contexto para acompanhar, orientar e evoluir com prudencia.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/78">
              O IODO RESET centraliza dados que costumam ficar espalhados em conversas, planilhas e anotacoes. O resultado e uma rotina mais clara para o paciente e uma leitura mais objetiva para o profissional.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 text-slate-950 shadow-2xl">
            <p className="text-sm font-semibold text-teal-800">Comece gratuito</p>
            <h3 className="mt-2 text-2xl font-semibold">Monte seu protocolo e teste a experiencia.</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              O app e educacional e nao substitui avaliacao medica. Use como sistema de organizacao, acompanhamento e conversa mais qualificada com profissionais.
            </p>
            <Link href="/login?mode=signup" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-5 py-4 font-semibold text-slate-950 transition-colors hover:bg-amber-300">
              Acessar o app
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-4xl px-5 py-16 md:py-24">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Perguntas frequentes</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight">Antes de comecar</h2>
        </div>
        <div className="space-y-4">
          {FAQ.map((item) => (
            <article key={item.q} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">{item.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-[#F7FBFC]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">IODO RESET - protocolo educacional assistido por dados</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-teal-800">Entrar</Link>
            <Link href="/login?mode=signup" className="text-sm font-semibold text-teal-800 hover:text-teal-950">Criar conta</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
