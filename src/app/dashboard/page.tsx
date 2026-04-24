// src/app/dashboard/page.tsx
// Server Component — lê dados no servidor e passa como props
// Sem 'use client' — renderiza no servidor, zero JS para auth check

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardView    from './DashboardView'
import type { ProtocolPhase, SemaphoreColor } from '@/lib/supabase/types'

export const metadata = {
  title: 'Dashboard — Protocolo IODO RESET',
}

export interface DashboardData {
  userName:           string
  phase:              ProtocolPhase
  drops:              number
  protocolStartDate:  string | null
  conditions:         string[]
  lastLog: {
    id:            string
    semaphore:    SemaphoreColor
    energy:       number | null
    mood:         number | null
    sleep_quality: number | null
    dose_drops:   number | null
    log_date:     string
  } | null
  recentLogs: {
    log_date:     string
    energy:       number | null
    mood:         number | null
    sleep_quality: number | null
    semaphore:    SemaphoreColor
    dose_drops:   number
  }[]
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Verificação de sessão no servidor
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Busca dados do usuário
  const { data: userData } = await supabase
    .from('users')
    .select('full_name, onboarding_done')
    .eq('id', user.id)
    .single<{ full_name: string | null; onboarding_done: boolean }>()

  if (!userData?.onboarding_done) redirect('/onboarding')

  // Busca perfil clínico
  const { data: profile } = await supabase
    .from('profiles')
    .select('phase, recommended_dose_drops, protocol_start_date, conditions')
    .eq('user_id', user.id)
    .single<{
      phase: ProtocolPhase
      recommended_dose_drops: number
      protocol_start_date: string | null
      conditions: string[]
    }>()

  if (!profile) redirect('/onboarding')

  // Busca último registro diário
  const { data: lastLog } = await supabase
    .from('daily_logs')
    .select('id, semaphore, energy, mood, sleep_quality, dose_drops, log_date')
    .eq('user_id', user.id)
    .order('log_date', { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string
      semaphore: SemaphoreColor
      energy: number | null
      mood: number | null
      sleep_quality: number | null
      dose_drops: number | null
      log_date: string
    }>()

  // Busca últimos 7 logs para o gráfico
  const { data: recentLogs } = await supabase
    .from('daily_logs')
    .select('log_date, energy, mood, sleep_quality, semaphore, dose_drops')
    .eq('user_id', user.id)
    .order('log_date', { ascending: false })
    .limit(7)

  const dashboardData: DashboardData = {
    userName:          userData?.full_name?.split(' ')[0] ?? 'Usuário',
    phase:             profile.phase,
    drops:             profile.recommended_dose_drops,
    protocolStartDate: profile.protocol_start_date,
    conditions:        profile.conditions ?? [],
    lastLog:           lastLog ?? null,
    recentLogs:        (recentLogs ?? []).reverse(),
  }

  return <DashboardView data={dashboardData} />
}
