import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminEmail } from '@/lib/adminAuth'
import type { PlanType } from '@/lib/supabase/types'
import {
  ADMIN_USER_SELECT,
  enrichAdminUsers,
  filterAdminUsersByStatus,
  type AdminUserRow,
} from '@/lib/admin-users'
import { listAdminAuditLogs, recordAdminAuditLog } from '@/lib/admin-audit'

const VALID_PLANS = new Set<PlanType>(['free', 'pro', 'clinic'])

type AdminUserPatch = {
  user_id?: string
  plan?: PlanType
  is_professional?: boolean
  onboarding_done?: boolean
}

type AdminUserAction = {
  action?: 'resend_confirmation'
  user_id?: string
}

type AdminActor = {
  id: string
  email: string
}

async function requireAdmin(): Promise<{ actor: AdminActor | null; response: NextResponse | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return {
      actor: null,
      response: NextResponse.json({ error: 'Acesso admin necessario.' }, { status: 403 }),
    }
  }

  return {
    actor: {
      id: user.id,
      email: user.email,
    },
    response: null,
  }
}

function cleanSearch(value: string | null): string {
  return (value ?? '')
    .trim()
    .replace(/[%,]/g, '')
    .slice(0, 80)
}

function getOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'

  if (forwardedHost) return `${proto}://${forwardedHost}`

  return new URL(request.url).origin
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
  const { response } = await requireAdmin()
  if (response) return response

  const search = cleanSearch(request.nextUrl.searchParams.get('q'))
  const plan = request.nextUrl.searchParams.get('plan')
  const status = request.nextUrl.searchParams.get('status') ?? 'all'
  const supabase = createAdminClient()

  let query = supabase
    .from('users')
    .select(ADMIN_USER_SELECT)
    .order('created_at', { ascending: false })
    .limit(100)

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
  }

  if (plan && VALID_PLANS.has(plan as PlanType)) {
    query = query.eq('plan', plan as PlanType)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const enrichedUsers = await enrichAdminUsers(supabase, (data ?? []) as AdminUserRow[])

  return NextResponse.json({
    users: filterAdminUsersByStatus(enrichedUsers, status),
    auditLogs: await listAdminAuditLogs(supabase),
  })
}

export async function POST(request: NextRequest) {
  const { actor, response } = await requireAdmin()
  if (response) return response
  if (!actor) return NextResponse.json({ error: 'Acesso admin necessario.' }, { status: 403 })

  const payload = await request.json().catch(() => ({})) as AdminUserAction
  if (payload.action !== 'resend_confirmation' || !payload.user_id) {
    return NextResponse.json({ error: 'Acao admin invalida.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('id', payload.user_id)
    .single<{ id: string; email: string }>()

  if (userError || !user) {
    return NextResponse.json({ error: userError?.message ?? 'Usuario nao encontrado.' }, { status: 404 })
  }

  const { data: authUser } = await supabase.auth.admin.getUserById(user.id)
  if (authUser.user?.email_confirmed_at) {
    await recordAdminAuditLog(supabase, {
      actor,
      action: 'resend_confirmation_skipped',
      targetUserId: user.id,
      targetEmail: user.email,
      summary: 'Reenvio ignorado: e-mail ja confirmado.',
      afterState: {
        email_confirmed_at: authUser.user.email_confirmed_at,
      },
    })
    return NextResponse.json({
      ok: true,
      message: 'Este e-mail ja esta confirmado.',
      auditLogs: await listAdminAuditLogs(supabase),
    })
  }

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: user.email,
    options: {
      emailRedirectTo: `${getOrigin(request)}/auth/callback?next=${encodeURIComponent('/dashboard')}`,
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await recordAdminAuditLog(supabase, {
    actor,
    action: 'resend_confirmation',
    targetUserId: user.id,
    targetEmail: user.email,
    summary: 'E-mail de confirmacao reenviado pelo admin.',
  })

  return NextResponse.json({
    ok: true,
    message: 'Confirmacao reenviada.',
    auditLogs: await listAdminAuditLogs(supabase),
  })
}

export async function PATCH(request: NextRequest) {
  const { actor, response } = await requireAdmin()
  if (response) return response
  if (!actor) return NextResponse.json({ error: 'Acesso admin necessario.' }, { status: 403 })

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
  const { data: beforeUser } = await supabase
    .from('users')
    .select(ADMIN_USER_SELECT)
    .eq('id', payload.user_id)
    .maybeSingle<AdminUserRow>()

  const { data, error } = await supabase
    .from('users')
    .update(update)
    .eq('id', payload.user_id)
    .select(ADMIN_USER_SELECT)
    .single<AdminUserRow>()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (data.plan === 'clinic' || data.is_professional) {
    await ensureProfessionalProfile(supabase, data)
  }

  await recordAdminAuditLog(supabase, {
    actor,
    action: 'update_user_access',
    targetUserId: data.id,
    targetEmail: data.email,
    summary: 'Acesso do usuario atualizado pelo admin.',
    beforeState: beforeUser ?? null,
    afterState: data,
    metadata: {
      patch: update,
    },
  })

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/profile')
  revalidatePath('/pro')
  revalidatePath('/exams')

  const [enrichedUser] = await enrichAdminUsers(supabase, [data])

  return NextResponse.json({
    user: enrichedUser,
    auditLogs: await listAdminAuditLogs(supabase),
  })
}
