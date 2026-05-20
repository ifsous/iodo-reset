'use client'
// src/app/onboarding/OnboardingForm.tsx
// Client Component — toda a lógica do multi-step onboarding

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { calculatePhase, type PhaseResult } from '@/lib/protocol/calculatePhase'
import type { SexType, SymptomType } from '@/lib/supabase/types'

// ── Tipos internos ────────────────────────────────────────────
interface FormData {
  // Etapa 1
  birthYear:  string
  sex:        SexType | ''
  // Etapa 2
  conditions: string[]
  // Etapa 3
  medications:       string[]
  priorIodineExp:    boolean | null
  cofactorsInUse:    string[]
  halogenExposure:   string[]
  // Etapa 4
  symptoms: SymptomType[]
  // Etapa 5
  safetyFlags:       string[]
  mainGoals:         string[]
  hasProfessional:   boolean | null
}

const INITIAL: FormData = {
  birthYear:        '',
  sex:              '',
  conditions:       [],
  medications:      [],
  priorIodineExp:   null,
  cofactorsInUse:   [],
  halogenExposure:  [],
  symptoms:         [],
  safetyFlags:      [],
  mainGoals:        [],
  hasProfessional:  null,
}

const TOTAL_STEPS = 6

// ── Helpers ───────────────────────────────────────────────────
function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
}

// ── Sub-componentes de UI ─────────────────────────────────────
function CheckChip<T extends string>({
  label, value, checked, onChange,
}: { label: string; value: T; checked: boolean; onChange: (v: T) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left ${
        checked
          ? 'bg-teal-800 border-teal-800 text-white'
          : 'bg-white border-gray-200 text-gray-700 hover:border-teal-400'
      }`}
    >
      {label}
    </button>
  )
}

function RadioChip<T extends string>({
  label, value, selected, onChange,
}: { label: string; value: T; selected: T | ''; onChange: (v: T) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
        selected === value
          ? 'bg-teal-800 border-teal-800 text-white'
          : 'bg-white border-gray-200 text-gray-700 hover:border-teal-400'
      }`}
    >
      {label}
    </button>
  )
}

function BoolChip({
  label, value, selected, onChange,
}: { label: string; value: boolean; selected: boolean | null; onChange: (v: boolean) => void }) {
  const isSelected = selected === value
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`px-6 py-2.5 rounded-lg border text-sm font-medium transition-all ${
        isSelected
          ? 'bg-teal-800 border-teal-800 text-white'
          : 'bg-white border-gray-200 text-gray-700 hover:border-teal-400'
      }`}
    >
      {label}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{children}</p>
}

function ErrorMsg({ msg }: { msg: string | null }) {
  if (!msg) return null
  return <p className="text-sm text-red-600 mt-2">{msg}</p>
}

// ── Componente principal ──────────────────────────────────────
export default function OnboardingForm() {
  const router  = useRouter()

  const [step,    setStep]    = useState(1)
  const [data,    setData]    = useState<FormData>(INITIAL)
  const [error,   setError]   = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [result,  setResult]  = useState<PhaseResult | null>(null)

  function next() { setError(null); setStep((s) => Math.min(s + 1, TOTAL_STEPS)) }
  function back() { setError(null); setStep((s) => Math.max(s - 1, 1)) }

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData((d) => ({ ...d, [key]: value }))
  }

  // Valida cada etapa antes de avançar
  function validate(): boolean {
    if (step === 1) {
      const year = parseInt(data.birthYear)
      if (!data.birthYear || isNaN(year) || year < 1924 || year > 2006) {
        setError('Informe um ano de nascimento válido (entre 1924 e 2006).')
        return false
      }
      if (!data.sex) {
        setError('Selecione seu sexo biológico.')
        return false
      }
    }
    if (step === 2 && data.conditions.length === 0) {
      setError('Selecione pelo menos uma opção.')
      return false
    }
    if (step === 3 && data.priorIodineExp === null) {
      setError('Responda se já usou iodo anteriormente.')
      return false
    }
    if (step === 4 && data.symptoms.length === 0) {
      setError('Selecione pelo menos um sintoma (ou "Nenhum").')
      return false
    }
    if (step === 5 && data.hasProfessional === null) {
      setError('Responda se tem acompanhamento profissional.')
      return false
    }
    if (step === 6) {
      if (data.mainGoals.length === 0) { setError('Selecione pelo menos um objetivo.'); return false }
      if (data.hasProfessional === null) { setError('Responda se tem acompanhamento profissional.'); return false }
    }
    return true
  }

  function handleNext() {
    if (!validate()) return
    // Na etapa 4→5, calcula o resultado antes de exibir a confirmação
    if (step === 5) {
      const year = parseInt(data.birthYear)
      setResult(calculatePhase({
        birthYear: year,
        conditions: data.conditions,
        symptoms: data.symptoms,
        medications: data.medications,
        cofactorsInUse: data.cofactorsInUse,
        priorIodineExp: data.priorIodineExp ?? false,
        hasProfessional: data.hasProfessional ?? false,
        halogenExposure: data.halogenExposure,
        safetyFlags: data.safetyFlags,
      }))
    }
    next()
  }

  async function handleSave() {
    if (!result) return
    setSaving(true)
    setError(null)

    if (!data.sex) { setError('Selecione seu sexo biologico.'); setSaving(false); return }

    const year = parseInt(data.birthYear)

    const response = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        birth_year:             year,
        sex:                    data.sex,
        conditions:             data.conditions,
        medications:            data.medications,
        prior_iodine_exp:       data.priorIodineExp ?? false,
        cofactors_in_use:       data.cofactorsInUse,
        halogen_exposure:       data.halogenExposure,
        safety_flags:           data.safetyFlags,
        has_professional_followup: data.hasProfessional ?? false,
        current_symptoms:       data.symptoms,
        main_goals:             data.mainGoals,
        phase:                  result.phase,
        protocol_start_date:    new Date().toISOString().split('T')[0],
        recommended_dose_drops: result.drops,
      }),
    })

    const saveResult = await response.json() as { error?: string }
    if (!response.ok) {
      setError(saveResult.error ?? 'Erro ao salvar perfil. Tente novamente.')
      setSaving(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }
  const pct = Math.round((step / TOTAL_STEPS) * 100)

  return (
    <div className="max-w-lg mx-auto px-4 py-8">

      {/* Barra de progresso */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">
            Etapa {step} de {TOTAL_STEPS}
          </span>
          <span className="text-xs font-medium text-teal-700">{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-600 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── ETAPA 1: Dados pessoais ── */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Dados pessoais</h2>
            <p className="text-sm text-gray-500 mt-1">
              Usamos essas informações para calcular sua dose inicial.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ano de nascimento
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1924}
              max={2006}
              placeholder="Ex: 1988"
              value={data.birthYear}
              onChange={(e) => set('birthYear', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-950 text-sm
                         focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            />
          </div>

          <div>
            <SectionLabel>Sexo biológico</SectionLabel>
            <div className="flex gap-3 flex-wrap">
              {([
                { label: 'Feminino',           value: 'female' },
                { label: 'Masculino',          value: 'male'   },
                { label: 'Prefiro não informar', value: 'other' },
              ] as const).map((o) => (
                <RadioChip key={o.value} {...o} selected={data.sex} onChange={(v) => set('sex', v)} />
              ))}
            </div>
          </div>

          <ErrorMsg msg={error} />
        </div>
      )}

      {/* ── ETAPA 2: Condições de saúde ── */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Condições de saúde</h2>
            <p className="text-sm text-gray-500 mt-1">
              Selecione todas que se aplicam. É a principal variável do seu protocolo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {([
              { label: 'Hipotireoidismo',     value: 'hipotireoidismo'  },
              { label: 'Hashimoto',           value: 'hashimoto'        },
              { label: 'Hipertireoidismo',    value: 'hipertireoidismo' },
              
              { label: 'Doenca de Graves',     value: 'graves'           },
              { label: 'Cistos mamários',     value: 'cistos_mamarios'  },
              { label: 'SOP',                 value: 'sop'              },
              { label: 'Endometriose',        value: 'endometriose'     },
              { label: 'Miomas',              value: 'miomas'           },
              { label: 'Próstata aumentada',  value: 'prostata'         },
              { label: 'Saudável — nenhuma',  value: 'saudavel'         },
            ] as const).map((o) => (
              <CheckChip
                key={o.value}
                label={o.label}
                value={o.value}
                checked={data.conditions.includes(o.value)}
                onChange={(v) => set('conditions', toggle(data.conditions, v))}
              />
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800 leading-relaxed">
              Suas respostas são confidenciais e usadas apenas para personalizar o protocolo. Não substituem diagnóstico médico.
            </p>
          </div>

          <ErrorMsg msg={error} />
        </div>
      )}

      {/* ── ETAPA 3: Medicamentos e experiência ── */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Medicamentos e experiência</h2>
            <p className="text-sm text-gray-500 mt-1">
              Ajuda a calibrar o ritmo de progressão do seu protocolo.
            </p>
          </div>

          <div>
            <SectionLabel>Medicamentos tireoidianos em uso</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Levotiroxina (Puran T4)', value: 'levotiroxina'  },
                { label: 'Euthyrox',                value: 'euthyrox'      },
                { label: 'Metimazol',               value: 'metimazol'     },
                { label: 'Propiltiouracil',         value: 'propiltiouracil' },
                { label: 'Outro tireoidiano',       value: 'outro_tireoidiano' },
                { label: 'Não uso nenhum',          value: 'nenhum'        },
              ].map((o) => (
                <CheckChip
                  key={o.value}
                  label={o.label}
                  value={o.value}
                  checked={data.medications.includes(o.value)}
                  onChange={(v) => set('medications', toggle(data.medications, v))}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Já usou iodo (Lugol ou similar) antes?</SectionLabel>
            <div className="flex gap-3">
              <BoolChip label="Sim" value={true}  selected={data.priorIodineExp} onChange={(v) => set('priorIodineExp', v)} />
              <BoolChip label="Não" value={false} selected={data.priorIodineExp} onChange={(v) => set('priorIodineExp', v)} />
            </div>
          </div>

          <div>
            <SectionLabel>Cofatores que já toma atualmente</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Selênio',          value: 'selenio'    },
                { label: 'Magnésio',         value: 'magnesio'   },
                { label: 'Vitamina D3 + K2', value: 'vit_d3_k2'  },
                { label: 'Vitaminas B2 + B3',value: 'vit_b2_b3'  },
                { label: 'Vitamina C',       value: 'vit_c'      },
                { label: 'Nenhum ainda',     value: 'nenhum'     },
              ].map((o) => (
                <CheckChip
                  key={o.value}
                  label={o.label}
                  value={o.value}
                  checked={data.cofactorsInUse.includes(o.value)}
                  onChange={(v) => set('cofactorsInUse', toggle(data.cofactorsInUse, v))}
                />
              ))}
            </div>
          </div>

          <ErrorMsg msg={error} />
        </div>
      )}

      {/* ── ETAPA 4: Sintomas atuais ── */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Sintomas atuais</h2>
            <p className="text-sm text-gray-500 mt-1">
              Esta é sua linha de base — a IA vai acompanhar a evolução desses sintomas ao longo do protocolo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {([
              { label: 'Cansaço / baixa energia',    value: 'extra_fatigue'        },
              { label: 'Queda de cabelo',             value: 'hair_loss'            },
              { label: 'Ganho de peso',               value: 'weight_gain'          },
              { label: 'Névoa mental',                value: 'brain_fog'            },
              { label: 'Intestino lento',             value: 'constipation'         },
              { label: 'Pele seca',                   value: 'dry_skin'             },
              { label: 'Sensação de frio',            value: 'cold_intolerance'     },
              { label: 'Dor nos seios',               value: 'breast_pain'          },
              { label: 'Ciclo irregular',             value: 'menstrual_worsening'  },
              { label: 'Ansiedade / irritabilidade',  value: 'anxiety'              },
              { label: 'Dor de cabeca',               value: 'headache'             },
              { label: 'Palpitacoes',                  value: 'palpitations'        },
              { label: 'Nenhum sintoma relevante',    value: 'none'                 },
            ] as const).map((o) => (
              <CheckChip
                key={o.value}
                label={o.label}
                value={o.value}
                checked={data.symptoms.includes(o.value)}
                onChange={(v) => {
                  if (v === 'none') {
                    set('symptoms', data.symptoms.includes('none') ? [] : ['none'])
                  } else {
                    set('symptoms', toggle(data.symptoms.filter((s) => s !== 'none'), v))
                  }
                }}
              />
            ))}
          </div>

          <ErrorMsg msg={error} />
        </div>
      )}

      {/* Etapa 5: seguranca e exposicao */}
      {step === 5 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Seguranca do protocolo</h2>
            <p className="text-sm text-gray-500 mt-1">
              Essas respostas ajudam a definir se o melhor caminho e iniciar, preparar cofatores ou seguir somente com profissional.
            </p>
          </div>

          <div>
            <SectionLabel>Sinais que pedem cautela</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Gravidez', value: 'pregnancy' },
                { label: 'Amamentacao', value: 'breastfeeding' },
                { label: 'Hipertensao', value: 'hypertension' },
                { label: 'Doenca renal', value: 'kidney_disease' },
                { label: 'Historico de palpitacoes', value: 'palpitations_history' },
                { label: 'Nenhum destes', value: 'none' },
              ].map((o) => (
                <CheckChip
                  key={o.value}
                  label={o.label}
                  value={o.value}
                  checked={data.safetyFlags.includes(o.value)}
                  onChange={(v) => {
                    if (v === 'none') {
                      set('safetyFlags', data.safetyFlags.includes('none') ? [] : ['none'])
                    } else {
                      set('safetyFlags', toggle(data.safetyFlags.filter((s) => s !== 'none'), v))
                    }
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Exposicao a halogenios</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Agua com fluor', value: 'fluoride_water' },
                { label: 'Muito pao/massas', value: 'bromide_bakery' },
                { label: 'Piscina/cloro frequente', value: 'chlorine_pool' },
                { label: 'Pasta dental com fluor', value: 'fluoride_toothpaste' },
                { label: 'Baixo consumo de sal', value: 'low_salt' },
                { label: 'Nao sei', value: 'unknown' },
              ].map((o) => (
                <CheckChip
                  key={o.value}
                  label={o.label}
                  value={o.value}
                  checked={data.halogenExposure.includes(o.value)}
                  onChange={(v) => set('halogenExposure', toggle(data.halogenExposure, v))}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Tem acompanhamento de profissional de saude?</SectionLabel>
            <div className="flex gap-3">
              <BoolChip label="Sim" value={true} selected={data.hasProfessional} onChange={(v) => set('hasProfessional', v)} />
              <BoolChip label="Nao" value={false} selected={data.hasProfessional} onChange={(v) => set('hasProfessional', v)} />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
            <p className="text-xs text-amber-800 leading-relaxed">
              Graves, hipertireoidismo ativo, gravidez, amamentacao, doenca renal, hipertensao ou palpitacoes exigem cuidado extra e acompanhamento profissional.
            </p>
          </div>

          <ErrorMsg msg={error} />
        </div>
      )}
      {/* ── Etapa 6: Objetivo + Resultado ── */}
      {step === 6 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Objetivo e confirmação</h2>
            <p className="text-sm text-gray-500 mt-1">
              Última etapa — veja seu protocolo calculado.
            </p>
          </div>

          <div>
            <SectionLabel>Objetivos do protocolo</SectionLabel>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Melhorar energia e disposição',     value: 'energia'      },
                { label: 'Equilibrar hormônios tireoidianos', value: 'tireoide'     },
                { label: 'Reduzir cistos ou nódulos',         value: 'cistos'       },
                { label: 'Melhorar saúde reprodutiva',        value: 'reprodutiva'  },
                { label: 'Prevenção e saúde geral',           value: 'prevencao'    },
              ].map((o) => (
                <CheckChip
                  key={o.value}
                  label={o.label}
                  value={o.value}
                  checked={data.mainGoals.includes(o.value)}
                  onChange={(v) => set('mainGoals', toggle(data.mainGoals, v))}
                />
              ))}
            </div>
          </div>

          {/* Resultado calculado */}
          {result && (
            <div className="bg-white border border-teal-100 rounded-lg shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-teal-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v12M2 8h12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-teal-900">Seu protocolo calculado</p>
                  <p className="text-xs text-teal-700">{result.label}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-lg p-3 border border-teal-100">
                  <p className="text-xs text-teal-600 mb-1">Dose inicial</p>
                  <p className="text-2xl font-semibold text-teal-900">{result.drops}</p>
                  <p className="text-xs text-teal-600">
                    {result.drops === 0 ? 'sem iodo por ora' : `gota${result.drops > 1 ? 's' : ''}/dia · ${result.mg}mg`}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-teal-100">
                  <p className="text-xs text-teal-600 mb-1">Fase</p>
                  <p className="text-2xl font-semibold text-teal-900">{result.phase}</p>
                  <p className="text-xs text-teal-600">de 4 fases</p>
                </div>
              </div>

              <div className={`rounded-lg border p-3 ${
                result.riskLevel === 'professional_only'
                  ? 'bg-red-50 border-red-100'
                  : result.riskLevel === 'caution'
                    ? 'bg-amber-50 border-amber-100'
                    : 'bg-emerald-50 border-emerald-100'
              }`}>
                <p className="text-xs font-semibold text-gray-900">
                  {result.riskLevel === 'professional_only'
                    ? 'Acompanhamento profissional necessario'
                    : result.riskLevel === 'caution'
                      ? 'Protocolo conservador'
                      : 'Protocolo padrao'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Estrategia: {result.progressionStrategy.replace(/_/g, ' ')}
                </p>
                {result.alerts.length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {result.alerts.map((alert) => (
                      <li key={alert} className="text-xs text-gray-700 flex gap-1">
                        <span>-</span><span>{alert}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="text-xs text-teal-800 leading-relaxed">{result.description}</p>

              <div>
                <p className="text-xs font-medium text-teal-700 mb-1">Cofatores prioritários:</p>
                <ul className="space-y-0.5">
                  {result.cofactors.slice(0, 4).map((c) => (
                    <li key={c} className="text-xs text-teal-700 flex gap-1">
                      <span>-</span><span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-gray-500 italic">
                Estas são orientações educacionais. Confirme com seu profissional de saúde antes de iniciar.
              </p>
            </div>
          )}

          <ErrorMsg msg={error} />
        </div>
      )}

      {/* ── Navegação ── */}
      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <button
            type="button"
            onClick={back}
            disabled={saving}
            className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium
                       text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            Voltar
          </button>
        )}

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 py-2.5 bg-teal-800 hover:bg-teal-900 text-white
                       rounded-lg text-sm font-medium transition-all"
          >
            Continuar
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !result}
            className="flex-1 py-2.5 bg-teal-800 hover:bg-teal-900 text-white
                       rounded-lg text-sm font-medium transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Salvando...
              </span>
            ) : 'Iniciar meu protocolo'}
          </button>
        )}
      </div>
    </div>
  )
}
