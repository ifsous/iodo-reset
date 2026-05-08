// src/app/profile/reset-password/page.tsx
// Server Component - a sessao vem do callback de recuperacao de senha

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ResetPasswordView from './ResetPasswordView'

export const metadata = {
  title: 'Redefinir senha - IODO RESET',
}

export default async function ResetPasswordPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?mode=reset')

  return <ResetPasswordView email={user.email ?? ''} />
}
