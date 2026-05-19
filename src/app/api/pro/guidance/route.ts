import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Nao autenticado.', 401)

  const body = await request.json() as {
    guidance_id?: string
    action?: 'read' | 'question' | 'responded'
    feedback?: string
  }

  const guidanceId = typeof body.guidance_id === 'string' ? body.guidance_id.trim() : ''
  if (!guidanceId) return jsonError('guidance_id e obrigatorio.')

  const action = body.action
  if (action !== 'read' && action !== 'question' && action !== 'responded') {
    return jsonError('Acao invalida.')
  }

  const now = new Date().toISOString()
  const feedback = typeof body.feedback === 'string'
    ? body.feedback.trim().slice(0, 1000) || null
    : null

  const update = {
    status: action,
    acknowledged_at: now,
    responded_at: action === 'responded' || action === 'question' ? now : null,
    patient_feedback: feedback,
    updated_at: now,
  }

  const { data, error } = await createAdminClient()
    .from('pro_guidance_history')
    .update(update)
    .eq('id', guidanceId)
    .eq('patient_id', user.id)
    .select('id, status, acknowledged_at, responded_at, patient_feedback')
    .single()

  if (error || !data) {
    return jsonError('Orientacao nao encontrada para este paciente.', 404)
  }

  return NextResponse.json({ ok: true, guidance: data })
}
