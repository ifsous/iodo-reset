// src/app/pro/accept/page.tsx
// Server Component - aceite de convite por paciente autenticado

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AcceptInviteView from './AcceptInviteView'

export const metadata = {
  title: 'Aceitar convite - IODO RESET',
}

type SearchParams = Promise<{ professional_id?: string; invite_id?: string }>

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { professional_id: professionalId, invite_id: inviteId } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const next = inviteId
      ? `/pro/accept?invite_id=${inviteId}`
      : professionalId
        ? `/pro/accept?professional_id=${professionalId}`
        : '/pro/accept'
    redirect(`/login?redirectTo=${encodeURIComponent(next)}`)
  }

  if (!inviteId && !professionalId) {
    return <AcceptInviteView professional={null} error="Convite incompleto." />
  }

  if (inviteId) {
    const adminSupabase = createAdminClient()
    const { data: invite } = await adminSupabase
      .from('pro_invites')
      .select('id, status, professional_id, patient_email')
      .eq('id', inviteId)
      .maybeSingle<{
        id: string
        status: string
        professional_id: string
        patient_email: string
      }>()

    if (!invite) {
      return <AcceptInviteView professional={null} error="Convite nao encontrado." />
    }

    if (invite.patient_email.trim().toLowerCase() !== (user.email ?? '').trim().toLowerCase()) {
      return <AcceptInviteView professional={null} error="Este convite foi enviado para outro e-mail. Entre com a conta correta." />
    }

    const { data: professional } = await adminSupabase
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
          inviteId: invite.id,
          displayName: professional.display_name,
          credential: professional.credential,
          specialty: professional.specialty,
          status: invite.status,
        }}
      />
    )
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
