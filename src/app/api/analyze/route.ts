// src/app/api/analyze/route.ts
// Rota POST — análise IA personalizada com Claude API
// Fluxo: auth → rate limit → cache check → Claude API → salvar cache → retornar

import { NextResponse, type NextRequest } from 'next/server'
import Anthropic                          from '@anthropic-ai/sdk'
import { createClient }                   from '@/lib/supabase/server'
import { createHash }                     from 'crypto'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const MODEL         = 'claude-sonnet-4-5'
const MAX_TOKENS    = 600   // 3–4 frases curtas — mais que suficiente
const FREE_LIMIT    = 3     // análises por dia no plano free
const CONTEXT_DAYS  = 14   // dias de histórico enviados para a IA

// ── System prompt especializado no Protocolo IODO RESET ────────
const SYSTEM_PROMPT = `Você é o assistente de saúde do app Protocolo IODO RESET. Seu papel é analisar os dados diários do usuário e fornecer orientação educacional personalizada, prática e humana.

REGRAS ABSOLUTAS:
- Nunca faça diagnóstico médico, prescrição ou indicação terapêutica
- Sempre deixe claro que suas orientações são educacionais
- Se semáforo vermelho ou palpitações: orienta a pausar e procurar profissional
- Máximo 4 frases curtas por resposta — seja direto e humano
- Fale diretamente com a pessoa (use "você")

ESTRUTURA DA RESPOSTA:
1. Uma frase reconhecendo o momento atual (fase, semáforo, tendência)
2. Uma análise breve do padrão recente (se houver histórico)
3. Uma orientação concreta para amanhã
4. Uma nota de cofatores SE o checklist estiver abaixo de 50% hoje

TOM: Humano, encorajador, objetivo. Como um amigo informado — não como médico.`

// ── Monta o prompt com os dados do usuário ────────────────────
function buildUserPrompt(context: Record<string, unknown>): string {
  const profile  = context.profile  as Record<string, unknown> | null
  const today    = context.today    as Record<string, unknown> | null
  const history  = context.history  as Record<string, unknown>[] | null
  const exams    = context.exams    as Record<string, unknown>[] | null

  // Calcula % do checklist de hoje
  const checkKeys = ['took_iodine','took_selenium','took_magnesium','took_vitamins','took_vitamin_c','drank_water','used_salt']
  const checkedCount = today
    ? checkKeys.filter((k) => today[k] === true).length
    : 0
  const checklistPct = Math.round((checkedCount / checkKeys.length) * 100)

  // Tendência de energia dos últimos 5 dias
  const recentEnergy = (history ?? [])
    .slice(0, 5)
    .map((l) => l.energy)
    .filter((e) => e !== null) as number[]
  const avgEnergy = recentEnergy.length
    ? Math.round(recentEnergy.reduce((a, b) => a + b, 0) / recentEnergy.length)
    : null

  // Padrão de semáforo recente
  const recentSemaphores = (history ?? []).slice(0, 7).map((l) => l.semaphore)
  const redDays    = recentSemaphores.filter((s) => s === 'red').length
  const yellowDays = recentSemaphores.filter((s) => s === 'yellow').length

  return `DADOS DO USUÁRIO — análise solicitada em ${new Date().toLocaleDateString('pt-BR')}

PERFIL:
- Fase atual: ${profile?.phase ?? 'desconhecida'}
- Condições: ${Array.isArray(profile?.conditions) ? (profile.conditions as string[]).join(', ') || 'nenhuma' : 'não informado'}
- Dose recomendada: ${profile?.recommended_dose_drops ?? '?'} gotas/dia
- Início do protocolo: ${profile?.protocol_start_date ?? 'não informado'}

REGISTRO DE HOJE:
- Dose tomada: ${today?.dose_drops ?? 0} gotas (${((today?.dose_drops as number ?? 0) * 6.25).toFixed(1)}mg)
- Energia: ${today?.energy ?? '?'}/10
- Humor: ${today?.mood ?? '?'}/10
- Sono: ${today?.sleep_quality ?? '?'}/10
- Sintomas: ${Array.isArray(today?.symptoms) && (today.symptoms as string[]).length > 0 ? (today.symptoms as string[]).join(', ') : 'nenhum'}
- Semáforo calculado: ${today?.semaphore ?? 'verde'}
- Checklist de cofatores: ${checkedCount}/7 (${checklistPct}%)
- Observações: ${today?.notes ?? 'nenhuma'}

HISTÓRICO RECENTE (${(history ?? []).length} dias):
- Energia média últimos 5 dias: ${avgEnergy !== null ? `${avgEnergy}/10` : 'sem dados'}
- Semáforos últimos 7 dias: ${redDays} vermelho(s), ${yellowDays} amarelo(s)
${(history ?? []).slice(0, 5).map((l) => `  - ${l.log_date}: energia ${l.energy ?? '?'}, humor ${l.mood ?? '?'}, dose ${l.dose_drops} gotas, semáforo ${l.semaphore}`).join('\n')}

EXAMES RECENTES:
${(exams ?? []).length > 0
  ? (exams as Record<string,unknown>[]).map((e) => `  - ${e.type}: ${e.value} ${e.unit ?? ''} (${e.in_range ? 'dentro' : 'fora'} da referência) — ${e.date}`).join('\n')
  : '  Nenhum exame registrado ainda.'
}

Com base nesses dados, forneça sua orientação educacional personalizada seguindo as regras do sistema.`
}

// ── Gera hash dos dados para cache ────────────────────────────
function hashContext(context: Record<string, unknown>): string {
  const str = JSON.stringify(context, Object.keys(context).sort())
  return createHash('sha256').update(str).digest('hex').slice(0, 32)
}

// ── Handler principal ─────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Verifica autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    // 2. Lê body
    const body = await request.json() as { log_id?: string }
    const { log_id } = body

    if (!log_id) {
      return NextResponse.json({ error: 'log_id é obrigatório.' }, { status: 400 })
    }

    // 3. Verifica plano e rate limit
    const { data: userData } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single()

    const isPro = (userData as { plan: string } | null)?.plan === 'pro' || (userData as { plan: string } | null)?.plan === 'clinic'

    if (!isPro) {
      const today = new Date().toISOString().split('T')[0]
      const { count } = await supabase
        .from('ai_analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00`)

      if ((count ?? 0) >= FREE_LIMIT) {
        return NextResponse.json({
          error: `Limite de ${FREE_LIMIT} análises por dia atingido no plano gratuito.`,
          upgrade: true,
        }, { status: 429 })
      }
    }

    // 4. Busca contexto completo via função SQL do banco
    const { data: contextData, error: contextError } = await supabase
      .rpc('get_ai_context' as never, {
        p_user_id:   user.id,
        p_log_id:    log_id,
        p_days_back: CONTEXT_DAYS,
      } as never)

    if (contextError || !contextData) {
      console.error('get_ai_context error:', contextError)
      return NextResponse.json({ error: 'Erro ao buscar contexto.' }, { status: 500 })
    }

    const context = contextData as Record<string, unknown>

    // 5. Verifica cache
    const inputHash = hashContext(context)

    const { data: cached } = await supabase
      .from('ai_analyses')
      .select('analysis_text, created_at')
      .eq('log_id', log_id)
      .eq('input_hash', inputHash)
      .maybeSingle() as any

    if (cached) {
      return NextResponse.json({
        analysis:   cached.analysis_text,
        from_cache: true,
        generated_at: cached.created_at,
      })
    }

    // 6. Chama Claude API
    const userPrompt = buildUserPrompt(context)

    const response = await anthropic.messages.create({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userPrompt }],
    })

    const analysisText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const inputTokens  = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    // Custo estimado claude-sonnet-4-5: $3/M input, $15/M output
    const costUsd = (inputTokens * 0.000003) + (outputTokens * 0.000015)

    // 7. Salva no cache
    await (supabase.from('ai_analyses').insert({
      log_id,
      user_id:      user.id,
      input_hash:   inputHash,
      context_days: CONTEXT_DAYS,
      analysis_text: analysisText,
      model_used:   MODEL,
      input_tokens:  inputTokens,
      output_tokens: outputTokens,
      cost_usd:     costUsd,
      from_cache:   false,
    }) as any)

    return NextResponse.json({
      analysis:     analysisText,
      from_cache:   false,
      generated_at: new Date().toISOString(),
    })

  } catch (err) {
    console.error('analyze route error:', err)
    return NextResponse.json(
      { error: 'Erro interno. Tente novamente.' },
      { status: 500 }
    )
  }
}
