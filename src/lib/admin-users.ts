import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, PlanType } from '@/lib/supabase/types'

export type AdminUser = {
  id: string
  email: string
  full_name: string | null
  plan: PlanType
  is_professional: boolean
  onboarding_done: boolean
  plan_started_at: string | null
  plan_expires_at: string | null
  created_at: string
  updated_at: string
  email_confirmed_at: string | null
  last_sign_in_at: string | null
  auth_created_at: string | null
}

export type AdminUserRow = Omit<
  AdminUser,
  'email_confirmed_at' | 'last_sign_in_at' | 'auth_created_at'
>

export const ADMIN_USER_SELECT =
  'id, email, full_name, plan, is_professional, onboarding_done, plan_started_at, plan_expires_at, created_at, updated_at'

export async function enrichAdminUsers(
  supabase: SupabaseClient<Database>,
  rows: AdminUserRow[]
): Promise<AdminUser[]> {
  if (rows.length === 0) return []

  const { data } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  const authById = new Map((data?.users ?? []).map((user) => [user.id, user]))

  return rows.map((row) => {
    const authUser = authById.get(row.id)

    return {
      ...row,
      email_confirmed_at: authUser?.email_confirmed_at ?? null,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
      auth_created_at: authUser?.created_at ?? null,
    }
  })
}

export function filterAdminUsersByStatus(users: AdminUser[], status: string): AdminUser[] {
  if (status === 'pending_email') {
    return users.filter((user) => !user.email_confirmed_at)
  }

  if (status === 'confirmed') {
    return users.filter((user) => Boolean(user.email_confirmed_at))
  }

  if (status === 'onboarding_pending') {
    return users.filter((user) => !user.onboarding_done)
  }

  if (status === 'professional') {
    return users.filter((user) => user.is_professional)
  }

  return users
}
