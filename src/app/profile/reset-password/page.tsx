// src/app/profile/reset-password/page.tsx
// Server Component - a sessao vem do callback de recuperacao de senha

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ResetPasswordView from './ResetPasswordView'

export const metadata = {
  title: 'Redefinir senha - IODO RESET',
}

type SearchParams = Promise<{ mode?: string }>

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const params = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?mode=reset')

  return <ResetPasswordView email={user.email ?? ''} requireCurrentPassword={params.mode === 'change'} />
}
