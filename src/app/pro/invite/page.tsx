// src/app/pro/invite/page.tsx
// Server Component - tela de convite para vincular pacientes

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InviteForm from './InviteForm'
import type { PlanType } from '@/lib/supabase/types'

export const metadata = {
  title: 'Convidar paciente - IODO RESET Pro',
}

export interface InvitePageData {
  professionalId: string
  displayName: string
  patientLimit: number
  linkedCount: number
}

export default async function InvitePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('plan, is_professional, onboarding_done')
    .eq('id', user.id)
    .single<{ plan: PlanType; is_professional: boolean; onboarding_done: boolean }>()

  if (!userData?.onboarding_done) redirect('/onboarding')

  const hasProAccess = userData.is_professional || userData.plan === 'pro' || userData.plan === 'clinic'
  if (!hasProAccess) redirect('/dashboard')

  const { data: professional } = await supabase
    .from('professionals')
    .select('id, display_name, patient_limit')
    .eq('user_id', user.id)
    .maybeSingle<{ id: string; display_name: string; patient_limit: number }>()

  if (!professional) redirect('/pro')

  const { count } = await supabase
    .from('pro_patients')
    .select('*', { count: 'exact', head: true })
    .eq('professional_id', professional.id)
    .in('status', ['pending', 'active', 'paused'])

  return (
    <InviteForm
      data={{
        professionalId: professional.id,
        displayName: professional.display_name,
        patientLimit: professional.patient_limit,
        linkedCount: count ?? 0,
      }}
    />
  )
}
