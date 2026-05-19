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

  const body = await request.json().catch(() => ({})) as {
    notification_id?: string
    action?: 'read' | 'archive'
  }

  const notificationId = typeof body.notification_id === 'string' ? body.notification_id.trim() : ''
  if (!notificationId) return jsonError('notification_id e obrigatorio.')

  const status = body.action === 'archive' ? 'archived' : 'read'
  const now = new Date().toISOString()

  const { data, error } = await createAdminClient()
    .from('notifications')
    .update({
      status,
      read_at: status === 'read' ? now : null,
      updated_at: now,
    })
    .eq('id', notificationId)
    .eq('user_id', user.id)
    .select('id, status')
    .single()

  if (error || !data) {
    return jsonError('Notificacao nao encontrada.', 404)
  }

  return NextResponse.json({ ok: true, notification: data })
}
