import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PlanType } from '@/lib/supabase/types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

async function requireProfessional() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: jsonError('Nao autenticado.', 401) }

  const { data: userData } = await supabase
    .from('users')
    .select('plan, is_professional')
    .eq('id', user.id)
    .single<{ plan: PlanType; is_professional: boolean }>()

  const hasProAccess = userData?.is_professional || userData?.plan === 'pro' || userData?.plan === 'clinic'
  if (!hasProAccess) return { error: jsonError('Acesso profissional necessario.', 403) }

  const { data: professional } = await supabase
    .from('professionals')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle<{ id: string }>()

  if (!professional) return { error: jsonError('Perfil profissional nao encontrado.', 404) }

  return { user, professional }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = normalizeEmail(searchParams.get('email'))

  if (!EMAIL_RE.test(email)) {
    return jsonError('Informe um email valido.')
  }

  const access = await requireProfessional()
  if (access.error) return access.error

  const adminSupabase = createAdminClient()
  const { data: patient } = await adminSupabase
    .from('users')
    .select('id, email, full_name')
    .eq('email', email)
    .maybeSingle<{ id: string; email: string; full_name: string | null }>()

  if (!patient) {
    return NextResponse.json({ found: false, email })
  }

  if (patient.id === access.user.id) {
    return jsonError('Voce nao pode convidar a propria conta.', 409)
  }

  const { data: existingLink } = await adminSupabase
    .from('pro_patients')
    .select('status')
    .eq('professional_id', access.professional.id)
    .eq('patient_id', patient.id)
    .maybeSingle<{ status: 'pending' | 'active' | 'paused' | 'ended' }>()

  return NextResponse.json({
    found: true,
    patient: {
      email: patient.email,
      full_name: patient.full_name,
      existing_status: existingLink?.status ?? null,
    },
  })
}
