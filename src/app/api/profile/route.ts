import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ProfilePatchPayload {
  full_name?: unknown
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function normalizeName(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const name = value.trim().replace(/\s+/g, ' ')
  if (name.length < 2 || name.length > 120) return null

  return name
}

export async function PATCH(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return jsonError('Sessao expirada. Faca login novamente.', 401)
  }

  const payload = await request.json() as ProfilePatchPayload
  const fullName = normalizeName(payload.full_name)

  if (!fullName) {
    return jsonError('Informe um nome com 2 a 120 caracteres.')
  }

  const { error } = await supabase
    .from('users')
    .update({ full_name: fullName })
    .eq('id', user.id)

  if (error) {
    return jsonError(`Erro ao atualizar perfil: ${error.message}`, 500)
  }

  return NextResponse.json({ ok: true, full_name: fullName })
}
