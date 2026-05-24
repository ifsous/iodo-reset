// src/app/onboarding/page.tsx
// Server Component - sem "use client"
// Mesmo padrao do login: page = Server, form = Client

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingForm, { type OnboardingInitialData } from './OnboardingForm'
import type { SexType, SymptomType } from '@/lib/supabase/types'

export const metadata = {
  title: 'Triagem Clinica - IODO RESET',
  description: 'Responda algumas perguntas para personalizar seu protocolo de iodo.',
}

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

function parseGoals(goal: string | null): string[] {
  if (!goal) return []
  return goal
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const isRetake = params?.mode === 'retake' || params?.refazer === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('onboarding_done')
    .eq('id', user.id)
    .single<{ onboarding_done: boolean }>()

  if (userData?.onboarding_done && !isRetake) {
    redirect('/dashboard')
  }

  const { data: profile } = isRetake
    ? await supabase
        .from('profiles')
        .select('birth_year, sex, conditions, medications, prior_iodine_exp, cofactors_in_use, halogen_exposure, current_symptoms, safety_flags, main_goal, has_professional_followup, protocol_start_date')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<{
          birth_year: number | null
          sex: SexType | null
          conditions: string[]
          medications: string[]
          prior_iodine_exp: boolean
          cofactors_in_use: string[]
          halogen_exposure: string[]
          current_symptoms: SymptomType[]
          safety_flags: string[]
          main_goal: string | null
          has_professional_followup: boolean
          protocol_start_date: string | null
        }>()
    : { data: null }

  const initialData: OnboardingInitialData | null = profile
    ? {
        birthYear: profile.birth_year ? String(profile.birth_year) : '',
        sex: profile.sex ?? '',
        conditions: profile.conditions ?? [],
        medications: profile.medications ?? [],
        priorIodineExp: profile.prior_iodine_exp,
        cofactorsInUse: profile.cofactors_in_use ?? [],
        halogenExposure: profile.halogen_exposure ?? [],
        symptoms: profile.current_symptoms ?? [],
        safetyFlags: profile.safety_flags ?? [],
        mainGoals: parseGoals(profile.main_goal),
        hasProfessional: profile.has_professional_followup,
        protocolStartDate: profile.protocol_start_date,
      }
    : null

  return (
    <div className="min-h-screen bg-[#F7FAF9]">
      <div className="bg-white border-b border-gray-200/70 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-800 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">IR</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Triagem Clinica IODO RESET</p>
            <p className="text-xs text-gray-500">
              {isRetake ? 'Atualize sua base clinica sem apagar historico' : 'Configure sua base clinica personalizada'}
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<OnboardingSkeleton />}>
        <OnboardingForm initialData={initialData} isRetake={isRetake} />
      </Suspense>
    </div>
  )
}
