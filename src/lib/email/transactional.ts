type EmailResult =
  | { status: 'sent'; id: string | null }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string }

type SendEmailInput = {
  to: string
  subject: string
  html: string
  text: string
  idempotencyKey?: string
}

type InviteEmailInput = {
  to: string
  patientName: string | null
  professionalName: string
  acceptUrl: string
}

type ProtocolAdjustmentEmailInput = {
  to: string
  patientName: string | null
  professionalName: string
  dose: number | null
  notes: string | null
  dashboardUrl: string
}

const DEFAULT_FROM = 'IODO RESET <onboarding@resend.dev>'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function paragraph(value: string): string {
  return `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6">${escapeHtml(value)}</p>`
}

function button(label: string, href: string): string {
  return [
    '<p style="margin:24px 0">',
    `<a href="${escapeHtml(href)}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:8px">`,
    escapeHtml(label),
    '</a>',
    '</p>',
  ].join('')
}

function layout(title: string, body: string): string {
  return [
    '<div style="margin:0;padding:32px 16px;background:#f7faf9;font-family:Arial,sans-serif">',
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:28px">',
    `<h1 style="margin:0 0 18px;color:#0f172a;font-size:22px;line-height:1.25">${escapeHtml(title)}</h1>`,
    body,
    '<p style="margin:24px 0 0;color:#64748b;font-size:12px;line-height:1.5">Conteudo educacional. Nao substitui orientacao medica profissional.</p>',
    '</div>',
    '</div>',
  ].join('')
}

function displayName(name: string | null, fallback: string): string {
  return name?.trim() || fallback
}

export async function sendTransactionalEmail(input: SendEmailInput): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM || DEFAULT_FROM

  if (!apiKey) {
    return { status: 'skipped', reason: 'RESEND_API_KEY nao configurada.' }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  })

  const result = await response.json().catch(() => ({})) as { id?: string; message?: string; error?: string }

  if (!response.ok) {
    return { status: 'failed', reason: result.message ?? result.error ?? 'Falha ao enviar e-mail.' }
  }

  return { status: 'sent', id: result.id ?? null }
}

export async function sendProfessionalInviteEmail(input: InviteEmailInput): Promise<EmailResult> {
  const patientName = displayName(input.patientName, 'Paciente')
  const html = layout(
    'Convite de acompanhamento clinico',
    [
      paragraph(`Ola, ${patientName}.`),
      paragraph(`${input.professionalName} convidou voce para compartilhar seu acompanhamento no IODO RESET.`),
      paragraph('Ao aceitar, o profissional podera acompanhar seus registros e enviar ajustes simples do protocolo pelo app.'),
      button('Aceitar acompanhamento', input.acceptUrl),
      paragraph(`Se o botao nao abrir, acesse este link: ${input.acceptUrl}`),
    ].join('')
  )

  return sendTransactionalEmail({
    to: input.to,
    subject: 'Convite para acompanhamento no IODO RESET',
    html,
    text: [
      `Ola, ${patientName}.`,
      `${input.professionalName} convidou voce para compartilhar seu acompanhamento no IODO RESET.`,
      `Aceite pelo link: ${input.acceptUrl}`,
    ].join('\n\n'),
    idempotencyKey: `pro-invite:${input.to}:${input.acceptUrl}`,
  })
}

export async function sendProtocolAdjustmentEmail(input: ProtocolAdjustmentEmailInput): Promise<EmailResult> {
  const patientName = displayName(input.patientName, 'Paciente')
  const doseText = input.dose === null
    ? 'O profissional removeu a sugestao de dose personalizada.'
    : `Nova sugestao profissional: ${input.dose} gotas.`
  const notesText = input.notes ? `Nota do profissional: ${input.notes}` : 'Acesse o dashboard para ver o contexto do ajuste.'

  const html = layout(
    'Seu protocolo recebeu um ajuste profissional',
    [
      paragraph(`Ola, ${patientName}.`),
      paragraph(`${input.professionalName} atualizou uma orientacao no seu acompanhamento.`),
      paragraph(doseText),
      paragraph(notesText),
      button('Ver ajuste no dashboard', input.dashboardUrl),
    ].join('')
  )

  return sendTransactionalEmail({
    to: input.to,
    subject: 'Ajuste profissional no seu protocolo',
    html,
    text: [
      `Ola, ${patientName}.`,
      `${input.professionalName} atualizou uma orientacao no seu acompanhamento.`,
      doseText,
      notesText,
      `Veja no dashboard: ${input.dashboardUrl}`,
    ].join('\n\n'),
    idempotencyKey: `protocol-adjustment:${input.to}:${input.dose ?? 'none'}:${input.notes ?? ''}`,
  })
}
