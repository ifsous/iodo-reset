import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminEmail } from '@/lib/adminAuth'
import AdminView from './AdminView'

export const metadata = {
  title: 'Admin - IODO RESET',
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (!isAdminEmail(user.email)) redirect('/dashboard')

  const adminSupabase = createAdminClient()
  const { data: users } = await adminSupabase
    .from('users')
    .select('id, email, full_name, plan, is_professional, onboarding_done, plan_started_at, plan_expires_at, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(30)

  return <AdminView adminEmail={user.email ?? ''} initialUsers={users ?? []} />
}
