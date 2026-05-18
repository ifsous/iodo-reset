import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminEmail } from '@/lib/adminAuth'
import type { PlanType } from '@/lib/supabase/types'

const VALID_PLANS = new Set<PlanType>(['free', 'pro', 'clinic'])

type AdminUserPatch = {
  user_id?: string
  plan?: PlanType
  is_professional?: boolean
  onboarding_done?: boolean
}

type AdminUserRow = {
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
}

async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Acesso admin necessario.' }, { status: 403 })
  }

  return null
}

function cleanSearch(value: string | null): string {
  return (value ?? '')
    .trim()
    .replace(/[%,]/g, '')
    .slice(0, 80)
}

async function ensureProfessionalProfile(
  supabase: ReturnType<typeof createAdminClient>,
  user: Pick<AdminUserRow, 'id' | 'email' | 'full_name'>
) {
  const { data: existing } = await supabase
    .from('professionals')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle<{ id: string }>()

  if (existing) return

  await supabase
    .from('professionals')
    .insert({
      user_id: user.id,
      display_name: user.full_name?.trim() || user.email.split('@')[0] || 'Profissional',
    })
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin()
  if (admin) return admin

  const search = cleanSearch(request.nextUrl.searchParams.get('q'))
  const supabase = createAdminClient()

  let query = supabase
    .from('users')
    .select('id, email, full_name, plan, is_professional, onboarding_done, plan_started_at, plan_expires_at, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(30)

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ users: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin()
  if (admin) return admin

  const payload = await request.json().catch(() => ({})) as AdminUserPatch
  if (!payload.user_id) {
    return NextResponse.json({ error: 'user_id e obrigatorio.' }, { status: 400 })
  }

  const update: {
    plan?: PlanType
    is_professional?: boolean
    onboarding_done?: boolean
    plan_started_at?: string | null
    plan_expires_at?: string | null
  } = {}

  if (payload.plan !== undefined) {
    if (!VALID_PLANS.has(payload.plan)) {
      return NextResponse.json({ error: 'Plano invalido.' }, { status: 400 })
    }

    update.plan = payload.plan
    update.plan_started_at = payload.plan === 'free' ? null : new Date().toISOString()
    update.plan_expires_at = null
    if (payload.plan === 'clinic') {
      update.is_professional = true
    }
  }

  if (payload.is_professional !== undefined) {
    update.is_professional = payload.is_professional
  }

  if (payload.onboarding_done !== undefined) {
    update.onboarding_done = payload.onboarding_done
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nenhuma alteracao enviada.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('users')
    .update(update)
    .eq('id', payload.user_id)
    .select('id, email, full_name, plan, is_professional, onboarding_done, plan_started_at, plan_expires_at, created_at, updated_at')
    .single<AdminUserRow>()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (data.plan === 'clinic' || data.is_professional) {
    await ensureProfessionalProfile(supabase, data)
  }

  return NextResponse.json({ user: data })
}
