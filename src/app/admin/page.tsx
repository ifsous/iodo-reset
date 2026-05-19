import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminEmail } from '@/lib/adminAuth'
import {
  ADMIN_USER_SELECT,
  enrichAdminUsers,
  filterAdminUsersByStatus,
  type AdminUserRow,
} from '@/lib/admin-users'
import { listAdminAuditLogs } from '@/lib/admin-audit'
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
    .select(ADMIN_USER_SELECT)
    .order('created_at', { ascending: false })
    .limit(50)

  const enrichedUsers = await enrichAdminUsers(adminSupabase, (users ?? []) as AdminUserRow[])
  const auditLogs = await listAdminAuditLogs(adminSupabase)

  return (
    <AdminView
      adminEmail={user.email ?? ''}
      initialUsers={filterAdminUsersByStatus(enrichedUsers, 'all')}
      initialAuditLogs={auditLogs}
    />
  )
}
