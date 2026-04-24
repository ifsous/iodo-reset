'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ExistingLog } from './page'
import type { Database, SemaphoreColor, SymptomType } from '@/lib/supabase/types'

type LogInsert = Database['public']['Tables']['daily_logs']['Insert']

interface Props {
  userId: string
  recommendedDrops: number
  existing: ExistingLog | null
  today: string
}

function calcSemaphore(drops: number, energy: number, mood: number, symptoms: string[], checklistPct: number): SemaphoreColor {
  const real = symptoms.filter((s) => s !== 'none')
  if (symptoms.includes('palpitations')) return 'red'
  if (drops >= 6 && real.length >= 3) return 'red'
  if (energy <= 3 || mood <= 3) return 'yellow'
  if (real.length >= 2) return 'yellow'
  if (checklistPct < 50) return 'yellow'
  return 'green'
}

const SYMPTOMS: { value: SymptomType; label: string }[] = [
  { value: 'headache',            label: 'Dor de cabeça'     },
  { value: 'acne',                label: 'Acne / espinhas'   },
  { value: 'extra_fatigue',       label: 'Cansaço extra'     },
  { value: 'breast_pain',         label: 'Dor nos seios'     },
  { value: 'rhinitis',            label: 'Rinite / catarro'  },
  { value: 'urinary_infection',   label: 'Infecção urinária' },
  { value: 'bad_breath',          label: 'Mau hálito'        },
  { value: 'menstrual_worsening', label: 'Piora menstrual'   },
  { value: 'palpitations',        label: 'Palpitações'       },
  { value: 'none',                label: 'Nenhum sintoma'    },
]

const CHECKLIST = [
  { key: 'took_iodine',    label: 'Tomei iodo com água e sal'   },
  { key: 'took_selenium',  label: 'Selênio'                     },
  { key: 'took_magnesium', label: 'Magnésio'                    },
  { key: 'took_vitamins',  label: 'Vitaminas D3 + K2 + B2 + B3' },
  { key: 'took_vitamin_c', label: 'Vitamina C'                  },
  { key: 'drank_water',    label: '2+ litros de água'           },
  { key: 'used_salt',      label: 'Sal integral extra'          },
] as const

type CheckKey = typeof CHECKLIST[number]['key']

const SEM = {
  green:  { dot: 'bg-emerald-500', bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-800', label: 'Continuar protocolo',  sub: 'Tudo certo — siga com a dose atual.'              },
  yellow: { dot: 'bg-amber-400',   bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-800',   label: 'Atenção — manter dose', sub: 'Aumente água e sal. Monitore os sintomas.'        },
  red:    { dot: 'bg-red-500',     bg: 'bg-red-50',      border: 'border-red-200',     text: 'text-red-800',     label: 'Pausar 2 dias',         sub: 'Reduza ou pause. Procure orientação se persistir.' },
}

function SliderField({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-lg font-semibold ${color}`}>{value}</span>
      </div>
      <input type="range" min={1} max={10} step={1} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-200 accent-teal-600" />
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400">1</span>
        <span className="text-xs text-gray-400">10</span>
      </div>
    </div>
  )
}

function SymptomChip({ label, checked, onClick, danger = false }: { label: string; checked: boolean; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left ${
        checked
          ? danger ? 'bg-red-600 border-red-600 text-white' : 'bg-teal-700 border-teal-700 text-white'
          : 'bg-white border-gray-200 text-gray-700 hover:border-teal-300'
      }`}>
      {label}
    </button>
  )
}

export default function DiaryForm({ userId, recommendedDrops, existing, today }: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const [drops,    setDrops]    = useState(existing?.dose_drops    ?? recommendedDrops)
  const [energy,   setEnergy]   = useState(existing?.energy        ?? 7)
  const [mood,     setMood]     = useState(existing?.mood          ?? 7)
  const [sleep,    setSleep]    = useState(existing?.sleep_quality ?? 7)
  const [symptoms, setSymptoms] = useState<SymptomType[]>(existing?.symptoms ?? [])
  const [checks,   setChecks]   = useState<Record<CheckKey, boolean>>({
    took_iodine:    existing?.took_iodine    ?? false,
    took_selenium:  existing?.took_selenium  ?? false,
    took_magnesium: existing?.took_magnesium ?? false,
    took_vitamins:  existing?.took_vitamins  ?? false,
    took_vitamin_c: existing?.took_vitamin_c ?? false,
    drank_water:    existing?.drank_water    ?? false,
    used_salt:      existing?.used_salt      ?? false,
  })
  const [notes,  setNotes]  = useState(existing?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const checkedCount  = Object.values(checks).filter(Boolean).length
  const checklistPct  = Math.round((checkedCount / CHECKLIST.length) * 100)
  const semaphore     = calcSemaphore(drops, energy, mood, symptoms, checklistPct)
  const sem           = SEM[semaphore]

  function toggleSymptom(val: SymptomType) {
    if (val === 'none') { setSymptoms(symptoms.includes('none') ? [] : ['none']); return }
    const without = symptoms.filter((s) => s !== 'none')
    setSymptoms(without.includes(val) ? without.filter((s) => s !== val) : [...without, val])
  }

  function toggleCheck(key: CheckKey) { setChecks((c) => ({ ...c, [key]: !c[key] })) }

  async function handleSave() {
    setSaving(true)
    setError(null)

    // dose_mg é GENERATED ALWAYS AS no banco — não incluir no payload
    const payload: LogInsert = {
      user_id:        userId,
      log_date:       today,
      dose_drops:     drops,
      energy,
      mood,
      sleep_quality:  sleep,
      symptoms,
      took_iodine:    checks.took_iodine,
      took_selenium:  checks.took_selenium,
      took_magnesium: checks.took_magnesium,
      took_vitamins:  checks.took_vitamins,
      took_vitamin_c: checks.took_vitamin_c,
      drank_water:    checks.drank_water,
      used_salt:      checks.used_salt,
      semaphore,
      notes:          notes.trim() || null,
      is_edited:      !!existing,
    }

    let dbError = null

    if (existing) {
      const { error } = await supabase
        .from('daily_logs')
        .update(payload)
        .eq('user_id', userId)
        .eq('log_date', today)
      dbError = error
    } else {
      const { error } = await supabase
        .from('daily_logs')
        .insert(payload)
      dbError = error
    }

    if (dbError) { setError('Erro ao salvar. Tente novamente.'); setSaving(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-teal-700 pt-12 pb-5 px-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-teal-200 hover:text-white transition-colors p-1">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h1 className="text-white text-lg font-semibold">{existing ? 'Editar registro' : 'Registro de hoje'}</h1>
            <p className="text-teal-200 text-xs">
              {new Date(today + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4 pt-4">

        {/* Semáforo em tempo real */}
        <div className={`${sem.bg} border ${sem.border} rounded-xl p-4 flex items-center gap-3`}>
          <div className={`w-4 h-4 rounded-full ${sem.dot} flex-shrink-0`} />
          <div>
            <p className={`text-sm font-semibold ${sem.text}`}>{sem.label}</p>
            <p className={`text-xs ${sem.text} opacity-80`}>{sem.sub}</p>
          </div>
        </div>

        {/* Dose */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-700">Dose tomada hoje</p>
            <span className="text-xs text-gray-400">Recomendada: {recommendedDrops} gotas</span>
          </div>
          <div className="flex items-center justify-center gap-6 py-3">
            <button type="button" onClick={() => setDrops((d) => Math.max(0, d - 1))}
              className="w-10 h-10 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center text-xl font-medium text-gray-600 hover:bg-gray-100 active:scale-95 transition-all">−</button>
            <div className="text-center">
              <span className="text-4xl font-semibold text-teal-700">{drops}</span>
              <p className="text-xs text-gray-400 mt-0.5">
                {drops === 0 ? 'sem iodo hoje' : `gota${drops > 1 ? 's' : ''} · ${(drops * 6.25).toFixed(1)}mg`}
              </p>
            </div>
            <button type="button" onClick={() => setDrops((d) => Math.min(12, d + 1))}
              className="w-10 h-10 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center text-xl font-medium text-gray-600 hover:bg-gray-100 active:scale-95 transition-all">+</button>
          </div>
        </div>

        {/* Sliders */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-5">
          <p className="text-sm font-medium text-gray-700">Como você está hoje?</p>
          <SliderField label="Energia" value={energy} onChange={setEnergy} color={energy >= 7 ? 'text-teal-600' : energy >= 4 ? 'text-amber-500' : 'text-red-500'} />
          <SliderField label="Humor"   value={mood}   onChange={setMood}   color={mood   >= 7 ? 'text-purple-600' : mood   >= 4 ? 'text-amber-500' : 'text-red-500'} />
          <SliderField label="Sono"    value={sleep}  onChange={setSleep}  color={sleep  >= 7 ? 'text-blue-600'   : sleep  >= 4 ? 'text-amber-500' : 'text-red-500'} />
        </div>

        {/* Sintomas */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Sintomas de hoje</p>
          <div className="grid grid-cols-2 gap-2">
            {SYMPTOMS.map((s) => (
              <SymptomChip key={s.value} label={s.label} checked={symptoms.includes(s.value)}
                onClick={() => toggleSymptom(s.value)} danger={s.value === 'palpitations'} />
            ))}
          </div>
          {symptoms.includes('palpitations') && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-800 leading-relaxed font-medium">
                Palpitações podem indicar reação ao iodo. Pause o protocolo e consulte um profissional antes de retomar.
              </p>
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">Cofatores de hoje</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              checklistPct >= 75 ? 'bg-emerald-50 text-emerald-700' :
              checklistPct >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
              {checkedCount}/{CHECKLIST.length}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div className={`h-full rounded-full transition-all duration-300 ${
              checklistPct >= 75 ? 'bg-emerald-500' : checklistPct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
              style={{ width: `${checklistPct}%` }} />
          </div>
          <div className="space-y-2">
            {CHECKLIST.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => toggleCheck(key)} className="w-full flex items-center gap-3 py-1 text-left">
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                  checks[key] ? 'bg-teal-600 border-teal-600' : 'border-gray-300 bg-white'}`}>
                  {checks[key] && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5.5L4 8L8.5 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className={`text-sm transition-colors ${checks[key] ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Observações */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder="Como foi seu dia? Alguma reação ou mudança que queira registrar..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none" />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button type="button" onClick={handleSave} disabled={saving}
          className="w-full py-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-base rounded-xl transition-all active:scale-[0.98] shadow-sm">
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Salvando...
            </span>
          ) : existing ? 'Atualizar registro' : 'Salvar registro do dia'}
        </button>

        <p className="text-xs text-gray-400 text-center pb-2">
          Conteúdo educacional · Não substitui orientação médica profissional
        </p>
      </div>
    </div>
  )
}
