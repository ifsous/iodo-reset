# IODO RESET

Aplicativo web mobile-first para organizar protocolo educacional de iodo com onboarding clinico, diario, exames, cofatores, acompanhamento profissional e analises educacionais com IA.

> O app tem finalidade educacional e de organizacao de dados. Ele nao substitui avaliacao, diagnostico ou tratamento medico.

## Status do produto

Implementado na base atual:

- Landing page promocional em portugues com CTA para login/cadastro.
- Login, cadastro, reenvio de confirmacao e recuperacao de senha com Supabase Auth.
- Protecao de rotas autenticadas via `src/proxy.ts`.
- Onboarding multi-etapas para montar perfil, cautelas, sintomas, objetivos e dose inicial.
- Motor de regras de protocolo em `src/lib/protocol` para fase, risco, estrategia, alertas e agenda de exames.
- Dashboard autenticado com dados de perfil, diario, progresso, notificacoes, plano e acompanhamento profissional.
- Diario diario com dose, energia, humor, sono, sintomas, checklist de cofatores e semaforo.
- Analise educacional com Claude/Anthropic, cache por hash e limites por plano.
- Tipos Supabase em `src/lib/supabase/types.ts`.
- Sentry e widget de suporte/feedback.

Em andamento ou a validar:

- Fluxo completo de pagamentos Stripe e webhooks.
- Consolidacao dos PRs abertos de tipagem/build.
- Cobertura automatizada de testes para fluxos criticos.
- Documentacao do schema/migrations Supabase.

## Tecnologias

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth e Database
- Anthropic Claude API
- Sentry para monitoramento
- Stripe para planos pagos

## Requisitos

- Node.js compativel com Next.js 16
- npm
- Projeto Supabase configurado
- Chave Anthropic para analises com IA
- Projeto Sentry, se monitoramento estiver ativo
- Conta Stripe, se pagamentos estiverem ativos

## Variaveis de ambiente

Crie um arquivo `.env.local` com os valores do projeto:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
NEXT_PUBLIC_APP_URL=http://localhost:3000
ANTHROPIC_API_KEY=sua-chave-anthropic

# Sentry, opcional em desenvolvimento
SENTRY_ORG=sua-org
SENTRY_PROJECT=seu-projeto
SENTRY_AUTH_TOKEN=seu-token

# Stripe, quando o fluxo de billing estiver ativo
STRIPE_SECRET_KEY=sua-chave-stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=sua-chave-publica-stripe
STRIPE_WEBHOOK_SECRET=seu-webhook-secret
```

A funcao `getSupabaseUrl()` normaliza `NEXT_PUBLIC_SUPABASE_URL`, entao informe a URL raiz do projeto Supabase sempre que possivel, sem `/rest/v1` ou query string.

## Como rodar

Instale as dependencias:

```bash
npm install
```

Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

Abra `http://localhost:3000`.

## Validacao local

Use estes comandos antes de publicar mudancas:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

A base nao depende mais de `next/font/google` no layout principal, para evitar falhas de build quando o ambiente nao consegue buscar fontes externas.

## Banco de dados

O app espera tabelas e funcoes compatíveis com os tipos em `src/lib/supabase/types.ts`, incluindo:

- `users`
- `profiles`
- `daily_logs`
- `ai_analyses`
- `exams`
- `notifications`
- `professionals`
- `pro_patients`
- `pro_guidance_history`
- `support_feedback`
- RPC `get_ai_context`
- RPC `calculate_semaphore`

Antes de validar os fluxos autenticados, confirme que o schema Supabase, RLS e triggers de criacao de usuario estao alinhados com esses tipos.

## Fluxos principais para QA

1. Criar conta e confirmar e-mail.
2. Fazer login.
3. Completar onboarding.
4. Acessar dashboard.
5. Registrar diario do dia.
6. Gerar analise com IA.
7. Registrar exames, quando disponivel.
8. Testar recuperacao de senha.
9. Testar widget de suporte.
10. Validar comportamento mobile.

## Observacoes de manutencao

- Evite manter varios PRs abertos para a mesma falha de TypeScript/Supabase. Consolide uma solucao e feche os duplicados.
- Se os tipos Supabase mudarem, regenere `src/lib/supabase/types.ts` e valide `npx tsc --noEmit`.
- Rotas com dados sensiveis devem continuar usando clientes Supabase no servidor.
- Alteracoes em IA devem preservar o tom educacional e as regras de seguranca do prompt.
