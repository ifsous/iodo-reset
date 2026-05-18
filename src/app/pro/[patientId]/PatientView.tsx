'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PatientDetailData } from './page'
import type { AlertLevel, ProtocolPhase, SemaphoreColor } from '@/lib/supabase/types'

const PHASE_LABELS: Record<ProtocolPhase, string> = {
  '0': 'Pre-protocolo',
  '1': 'Fase 1 - Ativacao',
  '2': 'Fase 2 - Progressao',
  '3': 'Fase 3 - Detox',
  '4': 'Fase 4 - Estabilizacao',
}

const ALERT_LABELS: Record<AlertLevel, string> = {
  ok: 'Estavel',
  attention: 'Atencao',
  urgent: 'Urgente',
}

const SEMAPHORE_DOT: Record<SemaphoreColor, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  red: 'bg-red-500',
}

function initials(name: string | null, email: string) {
  const source = name?.trim() || email
  return source.split(/\s+|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'IR'
}

function displayName(name: string | null, email: string) {
  return name?.trim() || email.split('@')[0] || 'Paciente'
}

function formatDate(date: string | null) {
  if (!date) return 'Sem registro'
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">{title}</h2>
      {children}
    </section>
  )
}

export default function PatientView({ data }: { data: PatientDetailData }) {
  const router = useRouter()
  const patient = data.patient
  const phase = patient.phase ? PHASE_LABELS[patient.phase] : 'Nao informado'
  const [notes, setNotes] = useState(patient.proNotes ?? '')
  const [customDose, setCustomDose] = useState(patient.customDoseSuggestion?.toString() ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)
  const [notesSaved, setNotesSaved] = useState(false)

  async function saveAdjustment() {
    setSavingNotes(true)
    setNotesError(null)
    setNotesSaved(false)

    const response = await fetch('/api/pro/protocol-adjustment', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: patient.id,
        custom_dose_suggestion: customDose.trim() === '' ? null : customDose,
        pro_notes: notes,
      }),
    })

    const result = await response.json() as {
      error?: string
      custom_dose_suggestion?: number | null
      pro_notes?: string | null
    }
    setSavingNotes(false)

    if (!response.ok) {
      setNotesError(result.error ?? 'Erro ao salvar ajuste.')
      return
    }

    setNotes(result.pro_notes ?? '')
    setCustomDose(result.custom_dose_suggestion?.toString() ?? '')
    setNotesSaved(true)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#F7FAF9] pb-8">
      <div className="bg-teal-800 pt-12 pb-6 px-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.push('/pro')}
            className="text-teal-100/80 hover:text-white text-xs flex items-center gap-1 mb-3 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L5 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Painel Pro
          </button>

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/10 text-white flex items-center justify-center font-semibold">
              {initials(patient.name, patient.email)}
            </div>
            <div className="min-w-0">
              <h1 className="text-white text-2xl font-semibold truncate">{displayName(patient.name, patient.email)}</h1>
              <p className="text-teal-100/80 text-sm truncate">{patient.email}</p>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <span className="bg-white/10 text-teal-50 border border-white/10 text-xs font-medium px-3 py-1 rounded-full">
              {ALERT_LABELS[patient.alertLevel]}
            </span>
            <span className="bg-white/10 text-teal-50 border border-white/10 text-xs font-medium px-3 py-1 rounded-full">
              {patient.status}
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg border border-gray-200/70 p-3 shadow-sm">
            <p className="text-xs text-gray-500">Fase</p>
            <p className="text-sm font-semibold text-gray-950 mt-1">{phase}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200/70 p-3 shadow-sm">
            <p className="text-xs text-gray-500">Dose</p>
            <p className="text-sm font-semibold text-gray-950 mt-1">{patient.recommendedDoseDrops ?? '-'} gotas</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200/70 p-3 shadow-sm">
            <p className="text-xs text-gray-500">Dia</p>
            <p className="text-sm font-semibold text-gray-950 mt-1">{patient.protocolDay ?? '-'}</p>
          </div>
        </div>

        <Card title="Ultimo registro">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${patient.lastSemaphore ? SEMAPHORE_DOT[patient.lastSemaphore] : 'bg-gray-300'}`} />
              <span className="text-sm text-gray-700">
                {patient.lastSemaphore ? `Semaforo ${patient.lastSemaphore}` : 'Sem registro recente'}
              </span>
            </div>
            <span className="text-xs text-gray-400">{formatDate(patient.lastLogDate)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
              <p className="text-[11px] text-gray-400">Energia</p>
              <p className="text-sm font-semibold text-gray-900">{patient.lastEnergy ?? '-'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
              <p className="text-[11px] text-gray-400">Humor</p>
              <p className="text-sm font-semibold text-gray-900">{patient.lastMood ?? '-'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
              <p className="text-[11px] text-gray-400">Dose</p>
              <p className="text-sm font-semibold text-gray-900">{patient.lastDoseDrops ?? '-'}</p>
            </div>
          </div>
        </Card>

        <Card title="Evolucao recente">
          {data.logs.length > 0 ? (
            <div className="space-y-2">
              {data.logs.slice(0, 7).map((log) => (
                <div key={log.logDate} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-16">{formatDate(log.logDate).replace(' de ', ' ')}</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${SEMAPHORE_DOT[log.semaphore]}`} />
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-teal-500" style={{ width: `${((log.energy ?? 0) / 10) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-5 text-right">{log.energy ?? '-'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Nenhum registro diario encontrado.</p>
          )}
        </Card>

        <Card title="Exames recentes">
          {data.exams.length > 0 ? (
            <div className="space-y-2">
              {data.exams.map((exam) => (
                <div key={exam.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{exam.label}</p>
                      <p className="text-xs text-gray-400">{formatDate(exam.examDate)}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {exam.resultValue ?? '-'} <span className="text-xs font-normal text-gray-400">{exam.resultUnit}</span>
                    </p>
                  </div>
                  {exam.aiInterpretation && (
                    <p className="text-xs text-gray-600 bg-teal-50 border border-teal-100 rounded-lg p-2 mt-2">
                      {exam.aiInterpretation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Nenhum exame cadastrado.</p>
          )}
        </Card>

        <Card title="Ajuste profissional">
          <div className="grid grid-cols-[1fr_auto] gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-gray-600" htmlFor="custom-dose">
                Dose sugerida
              </label>
              <input
                id="custom-dose"
                type="number"
                min={0}
                max={50}
                step={1}
                value={customDose}
                onChange={(event) => {
                  setCustomDose(event.target.value)
                  setNotesSaved(false)
                }}
                placeholder="Sem ajuste"
                className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div className="self-end rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 min-w-24">
              <p className="text-[11px] text-gray-400">Atual</p>
              <p className="text-sm font-semibold text-gray-900">{patient.recommendedDoseDrops ?? '-'} gotas</p>
            </div>
          </div>
          <textarea
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value)
              setNotesSaved(false)
            }}
            rows={5}
            maxLength={2000}
            placeholder="Oriente o paciente sobre como aplicar este ajuste e o que observar nos proximos dias."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none"
          />
          <p className="text-xs text-gray-500 leading-relaxed mt-2">
            Este ajuste aparece no dashboard do paciente e passa a orientar o Plano de Hoje, salvo quando houver alerta de seguranca.
          </p>
          <div className="flex items-center justify-between gap-3 mt-3">
            <p className="text-xs text-gray-400">{notes.length}/2000</p>
            <button
              onClick={saveAdjustment}
              disabled={savingNotes}
              className="px-4 py-2 rounded-lg bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white text-sm font-medium transition-all"
            >
              {savingNotes ? 'Salvando...' : 'Salvar ajuste'}
            </button>
          </div>
          {notesError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3 mt-3">{notesError}</p>
          )}
          {notesSaved && (
            <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-3 mt-3">Ajuste salvo.</p>
          )}
        </Card>
      </main>
    </div>
  )
}
