import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { PlanType } from '@/lib/supabase/types'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const clean = value.trim().replace(/\s+/g, ' ').slice(0, maxLength)
  return clean || null
}

function cleanLongText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const clean = value.trim().slice(0, maxLength)
  return clean || null
}

function cleanEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const clean = value.trim().toLowerCase()
  if (!clean) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return ''
  return clean
}

export async function PATCH(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Nao autenticado.', 401)

  const { data: userData } = await supabase
    .from('users')
    .select('plan, is_professional')
    .eq('id', user.id)
    .single<{ plan: PlanType; is_professional: boolean }>()

  const hasProAccess = userData?.is_professional || userData?.plan === 'pro' || userData?.plan === 'clinic'
  if (!hasProAccess) return jsonError('Acesso profissional necessario.', 403)

  const body = await request.json().catch(() => ({})) as {
    display_name?: unknown
    credential?: unknown
    specialty?: unknown
    bio?: unknown
    alert_email?: unknown
    alert_on_red?: unknown
    alert_on_yellow?: unknown
  }

  const displayName = cleanText(body.display_name, 120)
  if (!displayName || displayName.length < 2) {
    return jsonError('Informe um nome publico com pelo menos 2 caracteres.')
  }

  const alertEmail = cleanEmail(body.alert_email)
  if (alertEmail === '') {
    return jsonError('Informe um e-mail de alerta valido.')
  }

  const { data, error } = await supabase
    .from('professionals')
    .update({
      display_name: displayName,
      credential: cleanText(body.credential, 80),
      specialty: cleanText(body.specialty, 120),
      bio: cleanLongText(body.bio, 500),
      alert_email: alertEmail,
      alert_on_red: Boolean(body.alert_on_red),
      alert_on_yellow: Boolean(body.alert_on_yellow),
    })
    .eq('user_id', user.id)
    .select('id, display_name, credential, specialty, bio, patient_limit, alert_on_red, alert_on_yellow, alert_email, is_verified')
    .single<{
      id: string
      display_name: string
      credential: string | null
      specialty: string | null
      bio: string | null
      patient_limit: number
      alert_on_red: boolean
      alert_on_yellow: boolean
      alert_email: string | null
      is_verified: boolean
    }>()

  if (error || !data) return jsonError('Erro ao atualizar perfil profissional.', 500)

  revalidatePath('/pro')
  revalidatePath('/pro/invite')

  return NextResponse.json({
    ok: true,
    professional: {
      id: data.id,
      displayName: data.display_name,
      credential: data.credential,
      specialty: data.specialty,
      bio: data.bio,
      patientLimit: data.patient_limit,
      alertOnRed: data.alert_on_red,
      alertOnYellow: data.alert_on_yellow,
      alertEmail: data.alert_email,
      isVerified: data.is_verified,
    },
  })
}
