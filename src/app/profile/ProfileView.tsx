'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ProfileData } from './types'
import type { Json, PlanType, ProgressionStrategy, ProtocolPhase, ProtocolRiskLevel, SexType, SymptomType } from '@/lib/supabase/types'

const PHASE_LABELS: Record<ProtocolPhase, string> = {
  '0': 'Pre-protocolo',
  '1': 'Fase 1 - Ativacao',
  '2': 'Fase 2 - Progressao',
  '3': 'Fase 3 - Detox',
  '4': 'Fase 4 - Estabilizacao',
}

const SEX_LABELS: Record<SexType, string> = {
  female: 'Feminino',
  male: 'Masculino',
  other: 'Prefiro nao informar',
}

const PLAN_LABELS: Record<PlanType, string> = {
  free: 'Gratuito',
  pro: 'Pro',
  clinic: 'Clinica',
}

const RISK_LABELS: Record<ProtocolRiskLevel, string> = {
  standard: 'Padrao',
  caution: 'Conservador',
  professional_only: 'Somente com profissional',
}

const STRATEGY_LABELS: Record<ProgressionStrategy, string> = {
  cofactors_first: 'Cofatores primeiro',
  slow: 'Progressao lenta',
  standard: 'Progressao padrao',
  supervised: 'Supervisionado',
}

const CONDITION_LABELS: Record<string, string> = {
  hipotireoidismo: 'Hipotireoidismo',
  hashimoto: 'Hashimoto',
  hipertireoidismo: 'Hipertireoidismo',
  cistos_mamarios: 'Cistos mamarios',
  sop: 'SOP',
  endometriose: 'Endometriose',
  miomas: 'Miomas',
  prostata: 'Prostata aumentada',
  saudavel: 'Saudavel',
  graves: 'Doenca de Graves',
}

const MEDICATION_LABELS: Record<string, string> = {
  levotiroxina: 'Levotiroxina',
  euthyrox: 'Euthyrox',
  metimazol: 'Metimazol',
  propiltiouracil: 'Propiltiouracil',
  outro_tireoidiano: 'Outro tireoidiano',
  nenhum: 'Nao uso nenhum',
}

const SYMPTOM_LABELS: Record<SymptomType, string> = {
  headache: 'Dor de cabeca',
  acne: 'Acne',
  extra_fatigue: 'Cansaco extra',
  hair_loss: 'Queda de cabelo',
  weight_gain: 'Ganho de peso',
  brain_fog: 'Nevoa mental',
  constipation: 'Intestino lento',
  dry_skin: 'Pele seca',
  cold_intolerance: 'Sensacao de frio',
  breast_pain: 'Dor nos seios',
  rhinitis: 'Rinite',
  urinary_infection: 'Infeccao urinaria',
  bad_breath: 'Mau halito',
  menstrual_worsening: 'Piora menstrual',
  anxiety: 'Ansiedade',
  palpitations: 'Palpitacoes',
  none: 'Nenhum sintoma',
  other: 'Outro',
}

const GOAL_LABELS: Record<string, string> = {
  energia: 'Melhorar energia e disposicao',
  tireoide: 'Equilibrar hormonios tireoidianos',
  cistos: 'Reduzir cistos ou nodulos',
  reprodutiva: 'Melhorar saude reprodutiva',
  prevencao: 'Prevencao e saude geral',
}

const SAFETY_LABELS: Record<string, string> = {
  pregnancy: 'Gravidez',
  breastfeeding: 'Amamentacao',
  hypertension: 'Hipertensao',
  kidney_disease: 'Doenca renal',
  palpitations_history: 'Historico de palpitacoes',
  none: 'Nenhum sinal de cautela',
}

const HALOGEN_LABELS: Record<string, string> = {
  fluoride_water: 'Agua com fluor',
  bromide_bakery: 'Muito pao/massas',
  chlorine_pool: 'Piscina/cloro frequente',
  fluoride_toothpaste: 'Pasta dental com fluor',
  low_salt: 'Baixo consumo de sal',
  unknown: 'Nao sei',
}

type ExamScheduleItem = {
  key?: string
  label?: string
  timing?: string
  priority?: string
}

function parseExamSchedule(value: Json): ExamScheduleItem[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, Json | undefined> => item !== null && typeof item === 'object' && !Array.isArray(item))
    .map((item) => ({
      key: typeof item.key === 'string' ? item.key : undefined,
      label: typeof item.label === 'string' ? item.label : undefined,
      timing: typeof item.timing === 'string' ? item.timing : undefined,
      priority: typeof item.priority === 'string' ? item.priority : undefined,
    }))
}

function daysInProtocol(startDate: string | null): number {
  if (!startDate) return 0
  const diff = Math.floor((new Date().getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

function formatDate(date: string | null): string {
  if (!date) return 'Nao informado'

  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function initials(name: string | null, email: string): string {
  const source = name?.trim() || email
  const parts = source.split(/\s+|@/).filter(Boolean)

  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'IR'
}

function displayName(name: string | null): string {
  return name?.trim() || 'Usuario'
}

function prettyFallback(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function NavBar() {
  const router = useRouter()
  const pathname = usePathname()

  const items = [
    { label: 'Dashboard', path: '/dashboard', icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="11" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="11" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    )},
    { label: 'Diario', path: '/diary', icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="7" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="7" y1="10" x2="13" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="7" y1="13" x2="10" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )},
    { label: 'Exames', path: '/exams', icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M6 2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 7h4M8 10h4M8 13h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )},
    { label: 'Perfil', path: '/profile', icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )},
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200/70 z-50 shadow-[0_-8px_24px_rgba(15,23,42,0.04)]">
      <div className="max-w-lg mx-auto flex">
        {items.map((item) => {
          const active = pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                active ? 'text-teal-800' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {item.icon}
              <span className={`text-xs ${active ? 'font-medium' : ''}`}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">{title}</h2>
      {children}
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

function TagList({ values, labelMap, tone = 'teal' }: {
  values: string[]
  labelMap: Record<string, string>
  tone?: 'teal' | 'sky' | 'indigo' | 'slate'
}) {
  const colors = {
    teal: 'bg-teal-50 text-teal-800 border-teal-100',
    sky: 'bg-sky-50 text-sky-800 border-sky-100',
    indigo: 'bg-indigo-50 text-indigo-800 border-indigo-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  }

  if (values.length === 0) {
    return <p className="text-sm text-gray-400">Nao informado</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span key={value} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${colors[tone]}`}>
          {labelMap[value] ?? prettyFallback(value)}
        </span>
      ))}
    </div>
  )
}

export default function ProfileView({ data }: { data: ProfileData }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [editing, setEditing] = useState(false)
  const [optimisticName, setOptimisticName] = useState<string | null>(null)
  const currentName = optimisticName ?? displayName(data.user.fullName)
  const [draftName, setDraftName] = useState(currentName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const plan = data.user.isProfessional || data.user.plan === 'clinic' ? 'clinic' : data.user.plan
  const planClass = plan === 'clinic'
    ? 'bg-indigo-50 text-indigo-800 border-indigo-100'
    : plan === 'pro'
      ? 'bg-sky-50 text-sky-800 border-sky-100'
      : 'bg-white/10 text-teal-50 border-white/10'

  async function saveName() {
    const normalized = draftName.trim().replace(/\s+/g, ' ')
    if (normalized.length < 2 || normalized.length > 120) {
      setError('Informe um nome com 2 a 120 caracteres.')
      return
    }

    setSaving(true)
    setError(null)

    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: normalized }),
    })

    const result = await response.json() as { error?: string; full_name?: string }
    if (!response.ok) {
      setError(result.error ?? 'Erro ao atualizar perfil.')
      setSaving(false)
      return
    }

    setOptimisticName(result.full_name ?? normalized)
    setDraftName(result.full_name ?? normalized)
    setEditing(false)
    setSaving(false)
    router.refresh()
  }

  function cancelEdit() {
    setDraftName(currentName)
    setError(null)
    setEditing(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const protocolDays = daysInProtocol(data.profile.protocolStartDate)
  const doseMg = (data.profile.recommendedDoseDrops * 6.25).toFixed(1)
  const examSchedule = parseExamSchedule(data.profile.examSchedule)

  return (
    <div className="min-h-screen bg-[#F7FAF9] pb-24">
      <div className="bg-teal-800 pt-12 pb-6 px-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-lg bg-white/10 border border-white/10 text-white flex items-center justify-center font-semibold text-lg flex-shrink-0">
              {initials(currentName, data.user.email)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                {editing ? (
                  <input
                    autoFocus
                    value={draftName}
                    disabled={saving}
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void saveName()
                      if (event.key === 'Escape') cancelEdit()
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white text-gray-950 px-3 py-1.5 text-base font-medium focus:outline-none focus:ring-2 focus:ring-teal-200"
                  />
                ) : (
                  <h1 className="text-white text-2xl font-semibold truncate">{currentName}</h1>
                )}

                {editing ? (
                  <button
                    type="button"
                    onClick={() => void saveName()}
                    disabled={saving}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white text-teal-900 disabled:opacity-60"
                  >
                    {saving ? 'Salvando' : 'OK'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftName(currentName)
                      setEditing(true)
                    }}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white/10 text-teal-50 border border-white/10 hover:bg-white/15 transition-colors"
                  >
                    Editar
                  </button>
                )}
              </div>

              <p className="text-teal-100/80 text-sm truncate">{data.user.email}</p>
              <span className={`inline-flex mt-3 text-xs font-medium px-3 py-1 rounded-full border ${planClass}`}>
                {PLAN_LABELS[plan]}
              </span>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <Card title="Protocolo atual">
          <InfoRow label="Fase" value={PHASE_LABELS[data.profile.phase]} />
          <InfoRow label="Dose" value={`${data.profile.recommendedDoseDrops} gotas - ${doseMg}mg`} />
          <InfoRow label="Dias no protocolo" value={protocolDays} />
          <InfoRow label="Data de inicio" value={formatDate(data.profile.protocolStartDate)} />
          <InfoRow label="Risco do protocolo" value={RISK_LABELS[data.profile.protocolRiskLevel]} />
          <InfoRow label="Estrategia" value={STRATEGY_LABELS[data.profile.progressionStrategy]} />
          {data.profile.protocolAlerts.length > 0 && (
            <div className="pt-3 space-y-2">
              {data.profile.protocolAlerts.map((alert) => (
                <div key={alert} className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <p className="text-xs text-amber-800 leading-relaxed">{alert}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Dados pessoais">
          <InfoRow label="Ano de nascimento" value={data.profile.birthYear ?? 'Nao informado'} />
          <InfoRow label="Sexo biologico" value={data.profile.sex ? SEX_LABELS[data.profile.sex] : 'Nao informado'} />
        </Card>

        <Card title="Perfil clinico">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Condicoes</p>
              <TagList values={data.profile.conditions} labelMap={CONDITION_LABELS} tone="teal" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Medicamentos</p>
              <TagList values={data.profile.medications} labelMap={MEDICATION_LABELS} tone="sky" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Sintomas iniciais</p>
              <TagList values={data.profile.currentSymptoms} labelMap={SYMPTOM_LABELS} tone="indigo" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Objetivo</p>
              {data.profile.mainGoal ? (
                <TagList values={[data.profile.mainGoal]} labelMap={GOAL_LABELS} tone="slate" />
              ) : (
                <p className="text-sm text-gray-400">Nao informado</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Cautelas</p>
              <TagList values={data.profile.safetyFlags} labelMap={SAFETY_LABELS} tone="slate" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Exposicao a halogenios</p>
              <TagList values={data.profile.halogenExposure} labelMap={HALOGEN_LABELS} tone="sky" />
            </div>
          </div>
        </Card>

        <Card title="Monitoramento sugerido">
          {examSchedule.length > 0 ? (
            <div className="space-y-3">
              {examSchedule.slice(0, 5).map((item, index) => (
                <div key={item.key ?? `${item.label}-${index}`} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                  <p className="text-sm font-medium text-gray-900">{item.label ?? 'Exame sugerido'}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.timing ?? 'Conforme acompanhamento'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Nenhum exame sugerido ainda</p>
          )}
        </Card>

        <Card title="Conta">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => router.push('/profile/reset-password?mode=change')}
              className="w-full py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
            >
              Alterar senha
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="w-full py-3 bg-red-50 border border-red-100 rounded-lg text-sm font-medium text-red-700 hover:bg-red-100 transition-all"
            >
              Sair da conta
            </button>
          </div>
        </Card>

        <p className="text-xs text-gray-400 text-center pb-2">
          Conteudo educacional - Nao substitui orientacao medica profissional
        </p>
      </main>

      <NavBar />
    </div>
  )
}
