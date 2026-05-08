// src/app/pro/accept/page.tsx
// Server Component - aceite de convite por paciente autenticado

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AcceptInviteView from './AcceptInviteView'

export const metadata = {
  title: 'Aceitar convite - IODO RESET',
}

type SearchParams = Promise<{ professional_id?: string }>

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { professional_id: professionalId } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const next = professionalId ? `/pro/accept?professional_id=${professionalId}` : '/pro/accept'
    redirect(`/login?next=${encodeURIComponent(next)}`)
  }

  if (!professionalId) {
    return <AcceptInviteView professional={null} error="Convite incompleto." />
  }

  const { data: invite } = await supabase
    .from('pro_patients')
    .select('id, status, professional_id')
    .eq('professional_id', professionalId)
    .eq('patient_id', user.id)
    .maybeSingle<{ id: string; status: string; professional_id: string }>()

  if (!invite) {
    return <AcceptInviteView professional={null} error="Convite nao encontrado para sua conta." />
  }

  const { data: professional } = await supabase
    .from('professionals')
    .select('id, display_name, credential, specialty')
    .eq('id', invite.professional_id)
    .maybeSingle<{
      id: string
      display_name: string
      credential: string | null
      specialty: string | null
    }>()

  if (!professional) {
    return <AcceptInviteView professional={null} error="Profissional nao encontrado." />
  }

  return (
    <AcceptInviteView
      professional={{
        id: professional.id,
        displayName: professional.display_name,
        credential: professional.credential,
        specialty: professional.specialty,
        status: invite.status,
      }}
    />
  )
}
