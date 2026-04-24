// src/app/onboarding/page.tsx
// Server Component — sem "use client"
// Mesmo padrão do login: page = Server, form = Client

import { Suspense }       from 'react'
import { redirect }       from 'next/navigation'
import { createClient }   from '@/lib/supabase/server'
import OnboardingForm     from './OnboardingForm'

export const metadata = {
  title:       'Configure seu protocolo — IODO RESET',
  description: 'Responda algumas perguntas para personalizar seu protocolo de iodo.',
}

type OnboardingUserRow = { onboarding_done: boolean }

// Skeleton simples para o Suspense
function OnboardingSkeleton() {
  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
      <div className="h-1.5 bg-gray-100 rounded-full" />
      <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
      <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
      <div className="grid grid-cols-2 gap-2 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default async function OnboardingPage() {
  // Verifica sessão no servidor — se não logado, manda para /login
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Se já completou o onboarding, manda direto para o dashboard
  const { data: userData } = await supabase
    .from('users')
    .select('onboarding_done')
    .eq('id', user.id)
    .single()

  const typedUserData = userData as OnboardingUserRow | null
  if (typedUserData?.onboarding_done) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">IR</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Protocolo IODO RESET</p>
            <p className="text-xs text-gray-500">Configure seu protocolo personalizado</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <Suspense fallback={<OnboardingSkeleton />}>
        <OnboardingForm />
      </Suspense>

    </div>
  )
}
