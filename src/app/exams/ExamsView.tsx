'use client'
// src/app/exams/ExamsView.tsx
// Client Component — lista de exames + formulário de cadastro

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Exam } from './page'
import type { ExamType } from '@/lib/supabase/types'

// ── Tipos ─────────────────────────────────────────────────────
interface Props {
  userId: string
  exams:  Exam[]
}

// ── Config de exames ──────────────────────────────────────────
const EXAM_OPTIONS: { value: ExamType; label: string; unit: string; refMin: number; refMax: number }[] = [
  { value: 'tsh',              label: 'TSH',                    unit: 'mUI/L',   refMin: 0.4,  refMax: 4.0  },
  { value: 't3_free',          label: 'T3 Livre',               unit: 'pg/mL',   refMin: 2.3,  refMax: 4.2  },
  { value: 't4_free',          label: 'T4 Livre',               unit: 'ng/dL',   refMin: 0.8,  refMax: 1.8  },
  { value: 'anti_tpo',         label: 'Anti-TPO',               unit: 'UI/mL',   refMin: 0,    refMax: 35   },
  { value: 'anti_tg',          label: 'Anti-Tireoglobulina',    unit: 'UI/mL',   refMin: 0,    refMax: 115  },
  { value: 'selenium',         label: 'Selênio',                unit: 'mcg/L',   refMin: 70,   refMax: 150  },
  { value: 'magnesium',        label: 'Magnésio',               unit: 'mg/dL',   refMin: 1.6,  refMax: 2.6  },
  { value: 'vitamin_d',        label: 'Vitamina D (25-OH)',     unit: 'ng/mL',   refMin: 40,   refMax: 80   },
  { value: 'ferritin',         label: 'Ferritina',              unit: 'ng/mL',   refMin: 30,   refMax: 150  },
  { value: 'zinc',             label: 'Zinco',                  unit: 'mcg/dL',  refMin: 70,   refMax: 120  },
  { value: 'vitamin_b12',      label: 'Vitamina B12',           unit: 'pg/mL',   refMin: 300,  refMax: 900  },
  { value: 'crp',              label: 'PCR (Proteína C-reativa)', unit: 'mg/L',  refMin: 0,    refMax: 5    },
  { value: 'homocysteine',     label: 'Homocisteína',           unit: 'mcmol/L', refMin: 0,    refMax: 15   },
  { value: 'fasting_glucose',  label: 'Glicose em jejum',       unit: 'mg/dL',   refMin: 70,   refMax: 99   },
  { value: 'insulin',          label: 'Insulina',               unit: 'mcUI/mL', refMin: 2,    refMax: 15   },
  { value: 'lipid_panel',      label: 'Perfil Lipídico',        unit: 'mg/dL',   refMin: 0,    refMax: 200  },
  { value: 'cbc',              label: 'Hemograma Completo',     unit: '—',       refMin: 0,    refMax: 0    },
  { value: 'other',            label: 'Outro exame',            unit: '',        refMin: 0,    refMax: 0    },
]

const EXAM_MAP = Object.fromEntries(EXAM_OPTIONS.map(e => [e.value, e]))

// ── Helpers ───────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

function rangeStatus(exam: Exam): 'ok' | 'low' | 'high' | 'unknown' {
  if (exam.is_within_range === null) return 'unknown'
  if (exam.is_within_range) return 'ok'
  if (exam.result_value !== null && exam.reference_min !== null && exam.result_value < exam.reference_min) return 'low'
  return 'high'
}

const STATUS_CONFIG = {
  ok:      { bg: 'bg-emerald-50',  border: 'border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Normal'   },
  low:     { bg: 'bg-blue-50',     border: 'border-blue-200',    dot: 'bg-blue-500',    text: 'text-blue-700',    label: 'Abaixo'   },
  high:    { bg: 'bg-red-50',      border: 'border-red-200',     dot: 'bg-red-500',     text: 'text-red-700',     label: 'Acima'    },
  unknown: { bg: 'bg-gray-50',     border: 'border-gray-200',    dot: 'bg-gray-400',    text: 'text-gray-500',    label: 'Sem ref.' },
}

// ── NavBar ────────────────────────────────────────────────────
function NavBar() {
  const router   = useRouter()
  const items = [
    { label: 'Dashboard', path: '/dashboard', icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="11" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="11" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    )},
    { label: 'Diário', path: '/diary', icon: (
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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
      <div className="max-w-lg mx-auto flex">
        {items.map((item) => {
          return (
            <button key={item.path} onClick={() => router.push(item.path)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                item.path === '/exams' ? 'text-teal-700' : 'text-gray-400 hover:text-gray-600'}`}>
              {item.icon}
              <span className={`text-xs ${item.path === '/exams' ? 'font-medium' : ''}`}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ── Formulário de novo exame ──────────────────────────────────
function ExamForm({ userId, onSave, onCancel }: {
  userId: string
  onSave: (exam: Exam) => void
  onCancel: () => void
}) {
  const supabase = createClient()

  const [examType,    setExamType]    = useState<ExamType>('tsh')
  const [customLabel, setCustomLabel] = useState('')
  const [value,       setValue]       = useState('')
  const [unit,        setUnit]        = useState(EXAM_MAP['tsh'].unit)
  const [refMin,      setRefMin]      = useState(String(EXAM_MAP['tsh'].refMin))
  const [refMax,      setRefMax]      = useState(String(EXAM_MAP['tsh'].refMax))
  const [examDate,    setExamDate]    = useState(new Date().toISOString().split('T')[0])
  const [labName,     setLabName]     = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  function handleTypeChange(type: ExamType) {
    setExamType(type)
    const opt = EXAM_MAP[type]
    if (opt) {
      setUnit(opt.unit)
      setRefMin(opt.refMin > 0 ? String(opt.refMin) : '')
      setRefMax(opt.refMax > 0 ? String(opt.refMax) : '')
    }
  }

  async function handleSave() {
    if (!examDate) { setError('Informe a data do exame.'); return }
    setSaving(true)
    setError(null)

    const numValue  = value  ? parseFloat(value)  : null
    const numRefMin = refMin ? parseFloat(refMin) : null
    const numRefMax = refMax ? parseFloat(refMax) : null

    let isWithinRange: boolean | null = null
    if (numValue !== null && numRefMin !== null && numRefMax !== null) {
      isWithinRange = numValue >= numRefMin && numValue <= numRefMax
    }

    const payload = {
      user_id:         userId,
      exam_type:       examType,
      exam_label:      customLabel.trim() || null,
      result_value:    numValue,
      result_unit:     unit.trim() || null,
      reference_min:   numRefMin,
      reference_max:   numRefMax,
      is_within_range: isWithinRange,
      exam_date:       examDate,
      lab_name:        labName.trim() || null,
    }

    const { data, error: dbError } = await supabase
      .from('exams')
      .insert(payload)
      .select()
      .single()

    if (dbError || !data) {
      setError('Erro ao salvar exame. Tente novamente.')
      setSaving(false)
      return
    }

    onSave(data as Exam)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Novo exame</p>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Tipo do exame */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de exame</label>
        <select value={examType} onChange={(e) => handleTypeChange(e.target.value as ExamType)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
          {EXAM_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Label customizado (para "other") */}
      {examType === 'other' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nome do exame</label>
          <input type="text" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Ex: Iodo urinário"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
      )}

      {/* Valor e unidade */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Resultado</label>
          <input type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unidade</label>
          <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)}
            placeholder="mUI/L"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
      </div>

      {/* Referência */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Referência mín.</label>
          <input type="number" step="any" value={refMin} onChange={(e) => setRefMin(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Referência máx.</label>
          <input type="number" step="any" value={refMax} onChange={(e) => setRefMax(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
      </div>

      {/* Data e laboratório */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data da coleta</label>
          <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Laboratório</label>
          <input type="text" value={labName} onChange={(e) => setLabName(e.target.value)}
            placeholder="Nome do lab"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
      </div>

      {/* Preview do status */}
      {value && refMin && refMax && (
        <div className={`flex items-center gap-2 p-3 rounded-lg border ${
          parseFloat(value) >= parseFloat(refMin) && parseFloat(value) <= parseFloat(refMax)
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
            parseFloat(value) >= parseFloat(refMin) && parseFloat(value) <= parseFloat(refMax)
              ? 'bg-emerald-500' : 'bg-red-500'
          }`} />
          <p className={`text-xs font-medium ${
            parseFloat(value) >= parseFloat(refMin) && parseFloat(value) <= parseFloat(refMax)
              ? 'text-emerald-700' : 'text-red-700'
          }`}>
            {parseFloat(value) >= parseFloat(refMin) && parseFloat(value) <= parseFloat(refMax)
              ? `Dentro da referência (${refMin}–${refMax} ${unit})`
              : `Fora da referência (${refMin}–${refMax} ${unit})`
            }
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all">
          {saving ? 'Salvando...' : 'Salvar exame'}
        </button>
      </div>
    </div>
  )
}

// ── Card de exame ─────────────────────────────────────────────
function ExamCard({ exam, onDelete }: { exam: Exam; onDelete: (id: string) => void }) {
  const supabase = createClient()
  const status   = rangeStatus(exam)
  const cfg      = STATUS_CONFIG[status]
  const opt      = EXAM_MAP[exam.exam_type]
  const label    = exam.exam_label || opt?.label || exam.exam_type

  async function handleDelete() {
    if (!confirm('Remover este exame?')) return
    await supabase.from('exams').delete().eq('id', exam.id)
    onDelete(exam.id)
  }

  return (
    <div className={`bg-white rounded-xl border ${cfg.border} overflow-hidden`}>
      <div className="flex items-center gap-3 p-4">
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-gray-900">{label}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatDate(exam.exam_date)}
            {exam.lab_name && ` · ${exam.lab_name}`}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          {exam.result_value !== null && (
            <p className="text-lg font-semibold text-gray-900">
              {exam.result_value}
              <span className="text-xs text-gray-400 font-normal ml-1">{exam.result_unit}</span>
            </p>
          )}
          {exam.reference_min !== null && exam.reference_max !== null && (
            <p className="text-xs text-gray-400">
              ref: {exam.reference_min}–{exam.reference_max}
            </p>
          )}
        </div>
      </div>

      {exam.ai_interpretation && (
        <div className="px-4 pb-3 pt-0">
          <div className="bg-teal-50 border border-teal-100 rounded-lg p-3">
            <p className="text-xs text-gray-700 leading-relaxed">{exam.ai_interpretation}</p>
          </div>
        </div>
      )}

      <div className="px-4 pb-3 flex justify-end">
        <button onClick={handleDelete} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
          Remover
        </button>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function ExamsView({ userId, exams: initialExams }: Props) {
  const router = useRouter()
  const [exams,       setExams]       = useState<Exam[]>(initialExams)
  const [showForm,    setShowForm]    = useState(false)
  const [filterType,  setFilterType]  = useState<'all' | 'out'>('all')

  function handleSave(exam: Exam) {
    setExams(prev => [exam, ...prev])
    setShowForm(false)
  }

  function handleDelete(id: string) {
    setExams(prev => prev.filter(e => e.id !== id))
  }

  const filtered = filterType === 'out'
    ? exams.filter(e => e.is_within_range === false)
    : exams

  const outOfRange = exams.filter(e => e.is_within_range === false).length
  const inRange    = exams.filter(e => e.is_within_range === true).length

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* Header */}
      <div className="bg-teal-700 pt-12 pb-6 px-4">
        <div className="max-w-lg mx-auto">
          <button onClick={() => router.push('/dashboard')}
            className="text-teal-200 hover:text-white text-xs flex items-center gap-1 mb-3 transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L5 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Dashboard
          </button>
          <h1 className="text-white text-2xl font-semibold">Exames</h1>
          <p className="text-teal-200 text-sm mt-1">Histórico laboratorial do protocolo</p>

          {/* Resumo */}
          {exams.length > 0 && (
            <div className="flex gap-3 mt-4">
              <div className="bg-teal-600 rounded-lg px-3 py-2 flex-1 text-center">
                <p className="text-2xl font-semibold text-white">{exams.length}</p>
                <p className="text-xs text-teal-200">total</p>
              </div>
              <div className="bg-teal-600 rounded-lg px-3 py-2 flex-1 text-center">
                <p className="text-2xl font-semibold text-emerald-300">{inRange}</p>
                <p className="text-xs text-teal-200">normais</p>
              </div>
              <div className="bg-teal-600 rounded-lg px-3 py-2 flex-1 text-center">
                <p className="text-2xl font-semibold text-red-300">{outOfRange}</p>
                <p className="text-xs text-teal-200">fora ref.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* Botão novo exame */}
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="w-full bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white font-medium py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5"/>
              <path d="M9 5.5v7M5.5 9h7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Cadastrar novo exame
          </button>
        )}

        {/* Formulário */}
        {showForm && (
          <ExamForm
            userId={userId}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Filtros */}
        {exams.length > 0 && !showForm && (
          <div className="flex gap-2">
            {[
              { value: 'all', label: `Todos (${exams.length})` },
              { value: 'out', label: `Fora da ref. (${outOfRange})` },
            ].map(f => (
              <button key={f.value}
                onClick={() => setFilterType(f.value as 'all' | 'out')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  filterType === f.value
                    ? 'bg-teal-700 border-teal-700 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-teal-300'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Lista de exames */}
        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map(exam => (
              <ExamCard key={exam.id} exam={exam} onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          !showForm && (
            <div className="bg-white rounded-xl border border-gray-100 p-8 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12h6M9 16h4M7 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8l-5-5H7z" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                {filterType === 'out' ? 'Nenhum exame fora da referência' : 'Nenhum exame cadastrado'}
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">
                {filterType === 'out'
                  ? 'Todos os exames cadastrados estão dentro da referência.'
                  : 'Cadastre seus exames laboratoriais para acompanhar a evolução do protocolo.'
                }
              </p>
            </div>
          )
        )}

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
          <p className="text-xs text-amber-800 leading-relaxed">
            Os valores de referência pré-preenchidos são médias gerais. Sempre use os valores de referência do seu laboratório para avaliação correta.
          </p>
        </div>

        <p className="text-xs text-gray-400 text-center pb-2">
          Conteúdo educacional · Não substitui orientação médica profissional
        </p>
      </div>

      <NavBar />
    </div>
  )
}
