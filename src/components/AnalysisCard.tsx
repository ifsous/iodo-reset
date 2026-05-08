'use client'
// src/components/AnalysisCard.tsx
// Card de análise IA — botão, loading, resultado e cache indicator

import { useState } from 'react'

interface AnalysisResult {
  analysis:     string
  from_cache:   boolean
  generated_at: string
}

interface Props {
  logId:    string | null   // null = sem registro hoje ainda
  hasLog:   boolean         // true = existe registro do dia
  isPro:    boolean         // true = plano pro ou clinic
  analyses: number          // total de analises IA usadas no plano free
}

const FREE_LIMIT = 6

// ── Ícone IA ──────────────────────────────────────────────────
function AIIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
    </svg>
  )
}

// ── Animação de digitação ─────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
        />
      ))}
    </div>
  )
}

// ── Formata data/hora em PT-BR ─────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Componente principal ──────────────────────────────────────
export default function AnalysisCard({ logId, hasLog, isPro, analyses }: Props) {
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<AnalysisResult | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [upgrade,  setUpgrade]  = useState(false)

  const remainingFree = Math.max(0, FREE_LIMIT - analyses)
  const limitReached  = !isPro && remainingFree === 0

  async function handleAnalyze() {
    if (!logId || loading) return
    setLoading(true)
    setError(null)
    setUpgrade(false)

    try {
      const res = await fetch('/api/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ log_id: logId }),
      })

      const data = await res.json() as {
        analysis?:     string
        from_cache?:   boolean
        generated_at?: string
        error?:        string
        upgrade?:      boolean
      }

      if (!res.ok) {
        if (data.upgrade) setUpgrade(true)
        setError(data.error ?? 'Erro ao gerar análise.')
        return
      }

      setResult({
        analysis:     data.analysis!,
        from_cache:   data.from_cache ?? false,
        generated_at: data.generated_at!,
      })
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // ── Sem registro hoje ──────────────────────────────────────
  if (!hasLog) {
    return (
      <div className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <AIIcon className="text-teal-600" />
          <p className="text-sm font-medium text-gray-700">Análise do dia</p>
        </div>
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="2" width="14" height="16" rx="2" stroke="#9CA3AF" strokeWidth="1.5"/>
              <path d="M7 7h6M7 10h4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-sm text-gray-500">Faça o registro do dia primeiro</p>
          <p className="text-xs text-gray-400 mt-1">
            A análise usa seus dados de hoje para gerar orientações
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200/70 p-4 shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AIIcon className="text-teal-600" />
          <p className="text-sm font-medium text-gray-700">Análise do dia</p>
        </div>
        {!isPro && !result && (
          <span className="text-xs text-gray-400">
            {remainingFree} de {FREE_LIMIT} restantes
          </span>
        )}
        {result?.from_cache && (
          <span className="text-xs bg-gray-50 text-gray-400 border border-gray-100
                           px-2 py-0.5 rounded-full">
            cache
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-4">
          <TypingDots />
          <p className="text-xs text-gray-400 mt-2">Analisando seus dados...</p>
        </div>
      )}

      {/* Resultado */}
      {result && !loading && (
        <div className="space-y-3">
          <div className="bg-teal-50 border border-teal-100 rounded-lg p-3">
            <p className="text-sm text-gray-800 leading-relaxed">{result.analysis}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {result.from_cache
                ? `Gerada anteriormente às ${formatDate(result.generated_at)}`
                : `Gerada às ${formatDate(result.generated_at)}`
              }
            </p>
            <button
              onClick={() => { setResult(null); setError(null) }}
              className="text-xs text-teal-600 hover:text-teal-800 transition-colors"
            >
              Gerar nova
            </button>
          </div>
          <p className="text-xs text-gray-400 italic leading-relaxed">
            Conteúdo educacional — não substitui orientação médica profissional.
          </p>
        </div>
      )}

      {/* Erro */}
      {error && !loading && (
        <div className="space-y-3">
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          {upgrade && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-xs text-amber-800 leading-relaxed">
                Contrate o plano Pro para liberar analises ilimitadas, historico completo e acesso ao painel do profissional.
              </p>
              <button className="mt-2 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors">
                Ver plano Pro →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Botão — só aparece se não há resultado */}
      {!result && !loading && (
        <button
          onClick={handleAnalyze}
          disabled={limitReached || !logId}
          className={`w-full py-3 rounded-lg text-sm font-medium transition-all
            flex items-center justify-center gap-2 mt-1
            ${limitReached || !logId
              ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-100'
              : 'bg-teal-800 hover:bg-teal-900 text-white active:scale-[0.98]'
            }`}
        >
          <AIIcon />
          {limitReached
            ? 'Contrate o plano Pro para continuar'
            : 'Analisar meu dia com IA'
          }
        </button>
      )}

    </div>
  )
}
