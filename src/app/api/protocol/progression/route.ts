import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { decideAutoProgression, type AutoProgressionLog, type AutoProgressionProfile } from '@/lib/protocol/auto-progression'
import type { Json, ProgressionStrategy, ProtocolPhase } from '@/lib/supabase/types'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

type LastEventRow = {
  source: 'auto' | 'professional'
  created_at: string
}

export async function POST() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Nao autenticado.', 401)

  const { data: rawProfile } = await admin
    .from('profiles')
    .select('phase, recommended_dose_drops, protocol_start_date, protocol_risk_level, progression_strategy')
    .eq('user_id', user.id)
    .maybeSingle()
  const profile = rawProfile as AutoProgressionProfile | null

  if (!profile) return jsonError('Perfil nao encontrado.', 404)

  const [{ data: rawLogs }, { data: activeProfessionalLink }, { data: rawLastEvent }] = await Promise.all([
    admin
      .from('daily_logs')
      .select('log_date, semaphore, energy, mood, sleep_quality, dose_drops, symptoms, took_selenium, took_magnesium, took_vitamins, took_vitamin_c, drank_water, used_salt')
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
      .limit(7),
    admin
      .from('pro_patients')
      .select('id, custom_dose_suggestion')
      .eq('patient_id', user.id)
      .eq('status', 'active')
      .not('custom_dose_suggestion', 'is', null)
      .limit(1)
      .maybeSingle<{ id: string; custom_dose_suggestion: number | null }>(),
    admin
      .from('protocol_progression_events')
      .select('source, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<LastEventRow>(),
  ])

  const recentLogs = (rawLogs ?? []) as AutoProgressionLog[]
  const decision = decideAutoProgression({
    profile,
    recentLogs,
    hasActiveProfessionalDose: Boolean(activeProfessionalLink?.custom_dose_suggestion !== null && activeProfessionalLink?.custom_dose_suggestion !== undefined),
    lastEvent: rawLastEvent ?? null,
  })

  if (!decision.shouldUpdate) {
    return NextResponse.json({ ok: true, updated: false, reason: decision.reason })
  }

  const updatePayload: {
    phase: ProtocolPhase
    recommended_dose_drops: number
    progression_strategy?: ProgressionStrategy
    updated_at: string
  } = {
    phase: decision.toPhase,
    recommended_dose_drops: decision.toDoseDrops,
    updated_at: new Date().toISOString(),
  }

  if (decision.toProgressionStrategy) {
    updatePayload.progression_strategy = decision.toProgressionStrategy
  }

  const { error: updateError } = await admin
    .from('profiles')
    .update(updatePayload)
    .eq('user_id', user.id)

  if (updateError) {
    return jsonError('Nao foi possivel atualizar a progressao do protocolo.', 500)
  }

  await Promise.all([
    admin
      .from('protocol_progression_events')
      .insert({
        user_id: user.id,
        source: 'auto',
        actor_user_id: null,
        from_phase: profile.phase,
        to_phase: decision.toPhase,
        from_dose_drops: profile.recommended_dose_drops,
        to_dose_drops: decision.toDoseDrops,
        reason: decision.reason,
        metadata: decision.metadata as Json,
      }),
    admin
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'protocol_update',
        title: decision.toDoseDrops < profile.recommended_dose_drops ? 'Dose ajustada por seguranca' : 'Protocolo evoluiu',
        body: decision.toDoseDrops < profile.recommended_dose_drops
          ? `Sua dose recomendada foi ajustada para ${decision.toDoseDrops} gota${decision.toDoseDrops === 1 ? '' : 's'} por sinais recentes.`
          : `Voce avancou para a fase ${decision.toPhase} com ${decision.toDoseDrops} gota${decision.toDoseDrops === 1 ? '' : 's'} recomendada${decision.toDoseDrops === 1 ? '' : 's'}.`,
        action_url: '/dashboard',
        metadata: {
          source: 'auto',
          from_phase: profile.phase,
          to_phase: decision.toPhase,
          from_dose_drops: profile.recommended_dose_drops,
          to_dose_drops: decision.toDoseDrops,
        },
      }),
  ])

  return NextResponse.json({
    ok: true,
    updated: true,
    phase: decision.toPhase,
    recommended_dose_drops: decision.toDoseDrops,
    reason: decision.reason,
  })
}
