import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PlanType } from '@/lib/supabase/types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Nao autenticado.', 401)

  const body = await request.json() as { email?: string; pro_notes?: string }
  const email = normalizeEmail(body.email)
  const proNotes = typeof body.pro_notes === 'string'
    ? body.pro_notes.trim().slice(0, 2000) || null
    : null

  if (!EMAIL_RE.test(email)) {
    return jsonError('Informe um email valido.')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('plan, is_professional')
    .eq('id', user.id)
    .single<{ plan: PlanType; is_professional: boolean }>()

  const hasProAccess = userData?.is_professional || userData?.plan === 'pro' || userData?.plan === 'clinic'
  if (!hasProAccess) return jsonError('Acesso profissional necessario.', 403)

  const { data: professional } = await supabase
    .from('professionals')
    .select('id, patient_limit')
    .eq('user_id', user.id)
    .maybeSingle<{ id: string; patient_limit: number }>()

  if (!professional) {
    return jsonError('Perfil profissional nao encontrado.', 404)
  }

  const { data: patient } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('email', email)
    .maybeSingle<{ id: string; email: string; full_name: string | null }>()

  if (!patient) {
    return jsonError('Paciente nao encontrado. Ele precisa criar uma conta antes do convite.', 404)
  }

  if (patient.id === user.id) {
    return jsonError('Voce nao pode convidar a propria conta.')
  }

  const { count: linkedCount } = await supabase
    .from('pro_patients')
    .select('*', { count: 'exact', head: true })
    .eq('professional_id', professional.id)
    .in('status', ['pending', 'active', 'paused'])

  if ((linkedCount ?? 0) >= professional.patient_limit) {
    return jsonError('Limite de pacientes do perfil profissional atingido.', 409)
  }

  const { data: existing } = await supabase
    .from('pro_patients')
    .select('id, status')
    .eq('professional_id', professional.id)
    .eq('patient_id', patient.id)
    .maybeSingle<{ id: string; status: string }>()

  const now = new Date().toISOString()

  if (existing) {
    const { data, error } = await supabase
      .from('pro_patients')
      .update({
        status: existing.status === 'active' ? 'active' : 'pending',
        pro_notes: proNotes,
        invite_sent_at: now,
      })
      .eq('id', existing.id)
      .select('id, status')
      .single()

    if (error || !data) return jsonError('Erro ao atualizar convite.', 500)

    return NextResponse.json({
      ok: true,
      invite_id: data.id,
      status: data.status,
      patient: { id: patient.id, email: patient.email, full_name: patient.full_name },
      accept_path: `/pro/accept?professional_id=${professional.id}`,
    })
  }

  const { data, error } = await supabase
    .from('pro_patients')
    .insert({
      professional_id: professional.id,
      patient_id: patient.id,
      status: 'pending',
      pro_notes: proNotes,
      invite_sent_at: now,
    })
    .select('id, status')
    .single()

  if (error || !data) return jsonError('Erro ao criar convite.', 500)

  return NextResponse.json({
    ok: true,
    invite_id: data.id,
    status: data.status,
    patient: { id: patient.id, email: patient.email, full_name: patient.full_name },
    accept_path: `/pro/accept?professional_id=${professional.id}`,
  })
}
