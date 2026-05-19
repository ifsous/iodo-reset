import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PlanType } from '@/lib/supabase/types'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Nao autenticado.', 401)

  const body = await request.json() as { patient_id?: string; pro_notes?: string }
  const patientId = typeof body.patient_id === 'string' ? body.patient_id.trim() : ''
  const proNotes = typeof body.pro_notes === 'string'
    ? body.pro_notes.trim().slice(0, 2000) || null
    : null

  if (!patientId) {
    return jsonError('patient_id e obrigatorio.')
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
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle<{ id: string }>()

  if (!professional) return jsonError('Perfil profissional nao encontrado.', 404)

  const { data, error } = await supabase
    .from('pro_patients')
    .update({ pro_notes: proNotes })
    .eq('professional_id', professional.id)
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .select('id, pro_notes')
    .single()

  if (error || !data) {
    return jsonError('Paciente nao encontrado para este profissional.', 404)
  }

  return NextResponse.json({ ok: true, pro_notes: data.pro_notes })
}
