// src/app/diary/page.tsx
// Server Component — verifica auth e carrega dados do dia (se existir)

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DiaryForm        from './DiaryForm'
import type { SemaphoreColor, SymptomType } from '@/lib/supabase/types'

export const metadata = {
  title: 'Registrar hoje — IODO RESET',
}

export interface ExistingLog {
  id:            string
  dose_drops:    number
  energy:        number | null
  mood:          number | null
  sleep_quality: number | null
  symptoms:      SymptomType[]
  took_iodine:   boolean
  took_selenium: boolean
  took_magnesium:boolean
  took_vitamins: boolean
  took_vitamin_c:boolean
  drank_water:   boolean
  used_salt:     boolean
  notes:         string | null
  semaphore:     SemaphoreColor
}

type DiaryUserRow = { onboarding_done: boolean; full_name: string | null }
type DiaryProfileRow = { recommended_dose_drops: number; phase: string }

export default async function DiaryPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verifica onboarding
  const { data: userData } = await supabase
    .from('users')
    .select('onboarding_done, full_name')
    .eq('id', user.id)
    .single()

  const typedUserData = userData as DiaryUserRow | null
  if (!typedUserData?.onboarding_done) redirect('/onboarding')

  // Busca dose recomendada do perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('recommended_dose_drops, phase')
    .eq('user_id', user.id)
    .single()

  // Busca registro de hoje (se existir)
  const today = new Date().toISOString().split('T')[0]
  const { data: existing } = await supabase
    .from('daily_logs')
    .select('id, dose_drops, energy, mood, sleep_quality, symptoms, took_iodine, took_selenium, took_magnesium, took_vitamins, took_vitamin_c, drank_water, used_salt, notes, semaphore')
    .eq('user_id', user.id)
    .eq('log_date', today)
    .maybeSingle()

  const typedProfile = profile as DiaryProfileRow | null
  const typedExisting = existing as ExistingLog | null

  return (
    <DiaryForm
      userId={user.id}
      userName={typedUserData?.full_name?.split(' ')[0] ?? 'Você'}
      recommendedDrops={typedProfile?.recommended_dose_drops ?? 1}
      existing={typedExisting ?? null}
      today={today}
    />
  )
}
