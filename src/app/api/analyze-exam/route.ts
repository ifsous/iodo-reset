import { NextResponse, type NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { Database, PlanType } from '@/lib/supabase/types'
import { AI_FREE_LIMIT, AI_PRO_MONTHLY_LIMIT, getCurrentMonthStart } from '@/lib/ai-limits'

type ExamRow = Database['public']['Tables']['exams']['Row']

const MODEL = 'claude-sonnet-4-5'
const MAX_TOKENS = 400
let anthropicClient: Anthropic | null = null

function getAnthropicClient() {
  anthropicClient ??= new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  })
  return anthropicClient
}

const SYSTEM_PROMPT = `Voce e o assistente do app IODO RESET. Interprete este resultado laboratorial de forma educacional, clara e humana.

REGRAS:
- Nunca faca diagnostico ou prescricao
- Explique o que o valor significa no contexto do protocolo de iodo
- Se fora da referencia, explique a implicacao para o protocolo
- Se o protocolo estiver em professional_only ou cofactors_first, nao sugira progressao de dose
- Reforce monitoramento e acompanhamento profissional quando houver risco ou alerta
- Maximo 3 frases curtas
- Tom: informativo, sem alarmar`

function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status })
}

function examLabel(exam: Pick<ExamRow, 'exam_label' | 'exam_type'>): string {
  return exam.exam_label || exam.exam_type.replace(/_/g, ' ').toUpperCase()
}

function rangeStatus(exam: Pick<ExamRow, 'is_within_range'>): string {
  if (exam.is_within_range === true) return 'dentro da referencia'
  if (exam.is_within_range === false) return 'fora da referencia'
  return 'sem referencia cadastrada'
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return jsonError('Nao autenticado.', 401)
  }

  const body = await request.json() as { exam_id?: string }
  if (!body.exam_id) {
    return jsonError('exam_id e obrigatorio.')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('plan')
    .eq('id', user.id)
    .single<{ plan: PlanType }>()

  const isPro = userData?.plan === 'pro'
  const isClinic = userData?.plan === 'clinic'

  if (!isPro && !isClinic) {
    const [{ count: diaryAnalyses }, { count: examAnalyses }] = await Promise.all([
      supabase
        .from('ai_analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('exams')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('ai_interpreted_at', 'is', null),
    ])

    if ((diaryAnalyses ?? 0) + (examAnalyses ?? 0) >= AI_FREE_LIMIT) {
      return jsonError(
        `Limite gratuito de ${AI_FREE_LIMIT} analises com IA atingido. Contrate o plano Pro para continuar.`,
        429,
        { upgrade: true }
      )
    }
  }

  if (isPro) {
    const monthStart = getCurrentMonthStart()

    const [{ count: diaryAnalyses }, { count: examAnalyses }] = await Promise.all([
      supabase
        .from('ai_analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', monthStart),
      supabase
        .from('exams')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('ai_interpreted_at', 'is', null)
        .gte('ai_interpreted_at', monthStart),
    ])

    if ((diaryAnalyses ?? 0) + (examAnalyses ?? 0) >= AI_PRO_MONTHLY_LIMIT) {
      return jsonError(
        `Limite mensal de ${AI_PRO_MONTHLY_LIMIT} analises com IA atingido no plano Pro.`,
        429
      )
    }
  }

  const { data: exam, error: examError } = await supabase
    .from('exams')
    .select('*')
    .eq('id', body.exam_id)
    .eq('user_id', user.id)
    .single()

  if (examError || !exam) {
    return jsonError('Exame nao encontrado.', 404)
  }

  if (exam.ai_interpretation) {
    return NextResponse.json({ interpretation: exam.ai_interpretation, from_cache: true })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('phase, conditions, recommended_dose_drops, protocol_risk_level, progression_strategy, protocol_alerts')
    .eq('user_id', user.id)
    .single<{
      phase: string
      conditions: string[]
      recommended_dose_drops: number
      protocol_risk_level: string
      progression_strategy: string
      protocol_alerts: string[]
    }>()

  const label = examLabel(exam)
  const prompt = `Exame: ${label}
Resultado: ${exam.result_value ?? 'nao informado'} ${exam.result_unit ?? ''}
Referencia: ${exam.reference_min ?? '?'} - ${exam.reference_max ?? '?'} ${exam.result_unit ?? ''}
Status: ${rangeStatus(exam)}
Data: ${exam.exam_date}
${exam.lab_name ? `Laboratorio: ${exam.lab_name}` : ''}

Contexto do protocolo do usuario:
- Fase atual: ${profile?.phase ?? 'nao informada'}
- Condicoes: ${Array.isArray(profile?.conditions) ? profile.conditions.join(', ') || 'nenhuma' : 'nao informado'}
- Dose atual: ${profile?.recommended_dose_drops ?? '?'} gotas/dia
- Risco do protocolo: ${profile?.protocol_risk_level ?? 'standard'}
- Estrategia: ${profile?.progression_strategy ?? 'standard'}
- Alertas: ${Array.isArray(profile?.protocol_alerts) ? profile.protocol_alerts.join('; ') || 'nenhum' : 'nenhum'}

Interprete este resultado no contexto do Protocolo IODO RESET.`

  const response = await getAnthropicClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const interpretation = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('')
    .trim()

  if (!interpretation) {
    return jsonError('Nao foi possivel gerar interpretacao.', 500)
  }

  const interpretedAt = new Date().toISOString()
  const updatePayload = {
    ai_interpretation: interpretation,
    ai_interpreted_at: interpretedAt,
    ai_model_used: MODEL,
  } as never

  const { error: updateError } = await supabase
    .from('exams')
    .update(updatePayload)
    .eq('id', body.exam_id)
    .eq('user_id', user.id)

  if (updateError) {
    return jsonError('Erro ao salvar interpretacao.', 500)
  }

  return NextResponse.json({
    interpretation,
    interpreted_at: interpretedAt,
    model: MODEL,
    from_cache: false,
  })
}
