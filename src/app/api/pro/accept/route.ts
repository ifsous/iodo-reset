import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Nao autenticado.', 401)

  const body = await request.json() as { professional_id?: string; invite_id?: string }
  const inviteId = typeof body.invite_id === 'string' ? body.invite_id.trim() : ''
  const professionalId = typeof body.professional_id === 'string' ? body.professional_id.trim() : ''

  if (!inviteId && !professionalId) {
    return jsonError('professional_id e obrigatorio.')
  }

  if (inviteId) {
    const adminSupabase = createAdminClient()
    const userEmail = normalizeEmail(user.email)

    const { data: invite } = await adminSupabase
      .from('pro_invites')
      .select('id, professional_id, patient_email, patient_id, status, pro_notes')
      .eq('id', inviteId)
      .maybeSingle<{
        id: string
        professional_id: string
        patient_email: string
        patient_id: string | null
        status: 'pending' | 'active' | 'cancelled' | 'expired'
        pro_notes: string | null
      }>()

    if (!invite) return jsonError('Convite nao encontrado.', 404)
    if (normalizeEmail(invite.patient_email) !== userEmail) {
      return jsonError('Este convite foi enviado para outro e-mail. Entre com a conta correta.', 403)
    }
    if (invite.status === 'cancelled' || invite.status === 'expired') {
      return jsonError('Este convite nao esta mais ativo.', 409)
    }

    const now = new Date().toISOString()
    const { data: existingLink } = await adminSupabase
      .from('pro_patients')
      .select('id, status')
      .eq('professional_id', invite.professional_id)
      .eq('patient_id', user.id)
      .maybeSingle<{ id: string; status: string }>()

    const linkResult = existingLink
      ? await adminSupabase
          .from('pro_patients')
          .update({
            status: 'active',
            pro_notes: invite.pro_notes,
            invite_accepted_at: now,
          })
          .eq('id', existingLink.id)
          .select('id, status')
          .single()
      : await adminSupabase
          .from('pro_patients')
          .insert({
            professional_id: invite.professional_id,
            patient_id: user.id,
            status: 'active',
            pro_notes: invite.pro_notes,
            invite_sent_at: now,
            invite_accepted_at: now,
          })
          .select('id, status')
          .single()

    if (linkResult.error || !linkResult.data) {
      return jsonError('Erro ao aceitar convite.', 500)
    }

    await adminSupabase
      .from('pro_invites')
      .update({
        status: 'active',
        patient_id: user.id,
        invite_accepted_at: now,
        updated_at: now,
      })
      .eq('id', invite.id)

    return NextResponse.json({ ok: true, status: linkResult.data.status })
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
