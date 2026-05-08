import Link from 'next/link'

const FEATURES = [
  {
    title: 'Protocolo personalizado',
    text: 'O onboarding cruza sintomas, condicoes, cofatores, medicamentos e sinais de cautela para montar uma estrategia segura.',
  },
  {
    title: 'Diario com semaforo',
    text: 'Registre dose, energia, humor, sono, sintomas e cofatores. O app mostra quando continuar, observar ou pausar.',
  },
  {
    title: 'Exames com IA',
    text: 'Organize exames laboratoriais e receba interpretacoes educacionais no contexto do seu protocolo.',
  },
  {
    title: 'Guia de cofatores',
    text: 'Entenda o papel de selenio, magnesio, vitamina C, vitaminas B, D3 + K2, agua e sal integral.',
  },
]

const STEPS = [
  'Responda ao onboarding clinico em poucos minutos.',
  'Receba fase, dose inicial, estrategia e alertas personalizados.',
  'Acompanhe diariamente sua resposta com diario, exames e IA.',
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
      <path d="M3 8.2L6.4 11.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[330px]">
      <div className="absolute -inset-5 rounded-[2rem] bg-teal-200/30 blur-2xl" />
      <div className="relative rounded-[2rem] border border-white/20 bg-gray-950 p-2 shadow-2xl">
        <div className="rounded-[1.5rem] bg-[#F7FAF9] overflow-hidden">
          <div className="bg-teal-800 px-5 pt-8 pb-5">
            <p className="text-xs text-teal-100/80">Hoje no protocolo</p>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="text-white text-xl font-semibold">Fase 1</p>
                <p className="text-teal-100/80 text-xs">4 gotas - 25.0mg</p>
              </div>
              <span className="text-xs font-medium bg-white/10 border border-white/10 text-teal-50 px-2.5 py-1 rounded-full">
                Conservador
              </span>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="bg-white rounded-lg border border-gray-200/70 p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Continuar protocolo</p>
                  <p className="text-xs text-gray-500">Tudo certo com os dados de hoje.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                ['Energia', '8'],
                ['Humor', '7'],
                ['Sono', '8'],
              ].map(([label, value]) => (
                <div key={label} className="bg-white border border-gray-200/70 rounded-lg p-3">
                  <p className="text-[11px] text-gray-500">{label}</p>
                  <p className="text-xl font-semibold text-gray-950">{value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg border border-gray-200/70 p-3 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">IA educacional</p>
              <p className="text-xs text-gray-700 leading-relaxed mt-2">
                Sua tolerancia esta boa. Mantenha cofatores e observe sintomas antes de qualquer progressao.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200/70 p-3 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cofatores</p>
              <div className="mt-2 space-y-1.5">
                {['Selenio', 'Magnesio', 'Vitamina C'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-gray-700">
                    <span className="w-4 h-4 rounded bg-teal-50 border border-teal-100 text-teal-800 flex items-center justify-center">
                      <CheckIcon />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F7FAF9] text-gray-950">
      <header className="bg-teal-950 text-white">
        <nav className="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center font-bold">IR</span>
            <span className="font-semibold tracking-tight">IODO RESET</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-teal-50/80 hover:text-white transition-colors">
              Entrar
            </Link>
            <Link href="/login?mode=signup" className="text-sm font-medium bg-white text-teal-950 px-4 py-2 rounded-lg hover:bg-teal-50 transition-colors">
              Comecar
            </Link>
          </div>
        </nav>

        <section className="max-w-6xl mx-auto px-5 pt-8 pb-12 md:pt-16 md:pb-20 grid md:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
          <div>
            <p className="text-sm font-medium text-teal-200 mb-4">Aplicativo mobile-first para protocolos de iodo</p>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.02] max-w-3xl">
              Transforme um protocolo confuso em uma rotina clara, segura e acompanhavel.
            </h1>
            <p className="text-base md:text-lg text-teal-50/78 leading-relaxed mt-6 max-w-2xl">
              O IODO RESET organiza dose, sintomas, cofatores, exames e interpretacoes educacionais com IA para voce acompanhar sua resposta dia apos dia.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/login?mode=signup" className="inline-flex items-center justify-center bg-teal-400 text-teal-950 font-semibold px-6 py-4 rounded-lg hover:bg-teal-300 transition-colors">
                Criar minha conta
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center border border-white/20 text-white font-medium px-6 py-4 rounded-lg hover:bg-white/10 transition-colors">
                Ja tenho acesso
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {['Sem achismo diario', 'Com cofatores', 'Com exames', 'Com IA educacional'].map((item) => (
                <span key={item} className="text-xs font-medium text-teal-50 bg-white/10 border border-white/10 px-3 py-1.5 rounded-full">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <PhoneMockup />
        </section>
      </header>

      <section className="max-w-6xl mx-auto px-5 py-12 md:py-16">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            ['6', 'analises de IA no plano gratuito'],
            ['5', 'etapas de onboarding clinico'],
            ['18', 'tipos de exames para acompanhar'],
          ].map(([value, label]) => (
            <div key={label} className="bg-white border border-gray-200/70 rounded-lg p-5 shadow-sm">
              <p className="text-3xl font-semibold text-teal-900">{value}</p>
              <p className="text-sm text-gray-600 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-gray-200/70">
        <div className="max-w-6xl mx-auto px-5 py-14 md:py-20 grid md:grid-cols-[0.9fr_1.1fr] gap-10">
          <div>
            <p className="text-sm font-medium text-teal-800">Por que existe</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-3">
              O problema nao e apenas lembrar da dose. E saber o que seus dados estao dizendo.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="border border-gray-200/70 rounded-lg p-5">
                <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center mb-4">
                  <CheckIcon />
                </div>
                <h3 className="text-base font-semibold text-gray-950">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed mt-2">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-14 md:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-teal-800">Como funciona</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-3">
            Do cadastro ao acompanhamento em tres passos.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {STEPS.map((step, index) => (
            <div key={step} className="bg-white border border-gray-200/70 rounded-lg p-5 shadow-sm">
              <span className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center text-sm font-semibold">
                {index + 1}
              </span>
              <p className="text-sm text-gray-700 leading-relaxed mt-4">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-teal-950 text-white">
        <div className="max-w-6xl mx-auto px-5 py-14 md:py-20 grid md:grid-cols-[1fr_0.85fr] gap-10 items-center">
          <div>
            <p className="text-sm font-medium text-teal-200">Para usuarios e profissionais</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-3">
              Um painel para acompanhar o que costuma ficar espalhado em notas, conversas e planilhas.
            </h2>
            <p className="text-teal-50/78 leading-relaxed mt-4">
              Diario, exames, IA, perfil clinico e alertas ficam no mesmo lugar. O resultado e mais clareza para evoluir com prudencia.
            </p>
          </div>
          <div className="bg-white text-gray-950 rounded-lg p-5 shadow-xl">
            <p className="text-sm font-semibold text-gray-950">Comece gratuito</p>
            <p className="text-sm text-gray-600 mt-2">
              Crie sua conta, configure seu protocolo e use as primeiras analises de IA sem compromisso.
            </p>
            <Link href="/login?mode=signup" className="mt-5 inline-flex w-full items-center justify-center bg-teal-800 text-white font-semibold px-5 py-3 rounded-lg hover:bg-teal-900 transition-colors">
              Acessar o app
            </Link>
            <p className="text-xs text-gray-400 mt-3 text-center">Conteudo educacional. Nao substitui orientacao medica.</p>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-5 py-14 md:py-20">
        <div className="text-center mb-8">
          <p className="text-sm font-medium text-teal-800">Perguntas frequentes</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-3">Antes de comecar</h2>
        </div>
        <div className="space-y-3">
          {FAQ.map((item) => (
            <article key={item.q} className="bg-white border border-gray-200/70 rounded-lg p-5 shadow-sm">
              <h3 className="text-base font-semibold text-gray-950">{item.q}</h3>
              <p className="text-sm text-gray-600 leading-relaxed mt-2">{item.a}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-200/70 bg-white">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <p className="text-sm text-gray-500">IODO RESET - protocolo educacional assistido por dados</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-600 hover:text-teal-800 transition-colors">Entrar</Link>
            <Link href="/login?mode=signup" className="text-sm font-medium text-teal-800 hover:text-teal-950 transition-colors">Criar conta</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
