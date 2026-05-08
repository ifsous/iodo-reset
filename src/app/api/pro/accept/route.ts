import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Nao autenticado.', 401)

  const body = await request.json() as { professional_id?: string }
  const professionalId = typeof body.professional_id === 'string' ? body.professional_id.trim() : ''

  if (!professionalId) {
    return jsonError('professional_id e obrigatorio.')
  }

  const { data: invite } = await supabase
    .from('pro_patients')
    .select('id, status')
    .eq('professional_id', professionalId)
    .eq('patient_id', user.id)
    .maybeSingle<{ id: string; status: string }>()

  if (!invite) {
    return jsonError('Convite nao encontrado.', 404)
  }

  if (invite.status === 'ended') {
    return jsonError('Este vinculo foi encerrado.', 409)
  }

  const { data, error } = await supabase
    .from('pro_patients')
    .update({
      status: 'active',
      invite_accepted_at: new Date().toISOString(),
    })
    .eq('id', invite.id)
    .select('id, status')
    .single()

  if (error || !data) {
    return jsonError('Erro ao aceitar convite.', 500)
  }

  return NextResponse.json({ ok: true, status: data.status })
}
