// src/app/profile/reset-password/page.tsx
// Server Component - a sessao vem do callback de recuperacao de senha

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import ResetPasswordView from './ResetPasswordView'

export const metadata = {
  title: 'Redefinir senha - IODO RESET',
}

type SearchParams = Promise<{ mode?: string }>

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const params = await searchParams
  const cookieStore = await cookies()
  const isRecovery = params.mode === 'recovery'
  const hasRecoveryGrant = cookieStore.get('iodo_password_recovery')?.value === '1'

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?mode=reset')

  if (isRecovery && !hasRecoveryGrant) {
    redirect('/login?mode=reset&error=recovery_session_required')
  }

  return <ResetPasswordView email={user.email ?? ''} requireCurrentPassword={!isRecovery} />
}
