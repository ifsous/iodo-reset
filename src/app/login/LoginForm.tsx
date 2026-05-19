'use client'
// src/app/login/LoginForm.tsx
// Client Component — único lugar onde useSearchParams é usado

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type Mode = 'login' | 'signup' | 'reset'
type AuthAction = Mode | 'resend_signup'

const ERRORS: Record<string, string> = {
  'Invalid login credentials':            'E-mail ou senha incorretos.',
  'Email not confirmed':                  'Confirme seu e-mail antes de entrar.',
  'User already registered':              'Este e-mail já está cadastrado.',
  'Email rate limit exceeded':            'Muitas tentativas. Aguarde alguns minutos.',
  'Password should be at least 6':        'A senha deve ter pelo menos 6 caracteres.',
  'For security purposes':               'Aguarde alguns segundos e tente novamente.',
  'auth_callback_error':                  'Link inválido ou expirado. Tente novamente.',
}

function translateError(msg: string): string {
  if (msg.includes('session_expired')) {
    return 'Sua sessao expirou por inatividade. Entre novamente.'
  }

  for (const [key, value] of Object.entries(ERRORS)) {
    if (msg.includes(key)) return value
  }
  return 'Ocorreu um erro inesperado. Tente novamente.'
}

export default function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard'
  const callbackError = searchParams.get('error')
  const requestedMode = searchParams.get('mode')
  const initialMode: Mode =
    requestedMode === 'reset' || requestedMode === 'signup' ? requestedMode : 'login'

  const [mode,     setMode]     = useState<Mode>(initialMode)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [rememberDevice, setRememberDevice] = useState(false)
  const [error,    setError]    = useState<string | null>(
    () => callbackError ? translateError(callbackError) : null
  )
  const [success,  setSuccess]  = useState<string | null>(null)
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false)

  function reset() {
    setError(null)
    setSuccess(null)
    setNeedsEmailConfirmation(false)
  }
  function switchMode(m: Mode) { reset(); setMode(m) }

  async function submitAuth(payload: {
    action: AuthAction
    email: string
    password?: string
    name?: string
    redirectTo?: string
    rememberDevice?: boolean
  }): Promise<string | null> {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const result = await response.json() as { error?: string }
    return response.ok ? null : result.error ?? 'auth_request_failed'
  }

  // ── Login ──────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    reset()

    const error = await submitAuth({
      action: 'login',
      email: email.trim(),
      password,
      rememberDevice,
    })

    if (error) {
      if (error.includes('Email not confirmed')) {
        setError('Cadastro ainda nao validado. Confirme seu e-mail para ativar a conta antes de entrar.')
        setNeedsEmailConfirmation(true)
      } else {
        setError(translateError(error))
      }
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  // ── Signup ─────────────────────────────────────────────────
  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    reset()

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      setLoading(false)
      return
    }

    const error = await submitAuth({
      action: 'signup',
      email: email.trim(),
      password,
      name,
      redirectTo,
    })

    if (error) {
      setError(translateError(error))
      setLoading(false)
      return
    }

    setSuccess('Conta criada! Valide seu cadastro pelo e-mail de confirmacao antes de entrar.')
    setNeedsEmailConfirmation(true)
    setLoading(false)
  }

  async function handleResendConfirmation() {
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setError('Informe o e-mail para reenviar a confirmacao.')
      return
    }

    setLoading(true)
    setError(null)

    const error = await submitAuth({
      action: 'resend_signup',
      email: trimmedEmail,
      redirectTo,
    })

    if (error) {
      setError(translateError(error))
    } else {
      setSuccess('E-mail de confirmacao reenviado. Verifique sua caixa de entrada e spam.')
      setNeedsEmailConfirmation(true)
    }

    setLoading(false)
  }

  // ── Reset de senha ─────────────────────────────────────────
  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    reset()

    const error = await submitAuth({
      action: 'reset',
      email: email.trim(),
    })

    if (error) {
      setError(translateError(error))
    } else {
      setSuccess('E-mail enviado! Verifique sua caixa de entrada.')
    }
    setLoading(false)
  }

  const submitHandler =
    mode === 'login'  ? handleLogin  :
    mode === 'signup' ? handleSignup :
    handleReset

  // ── UI ─────────────────────────────────────────────────────
  return (
    <div className="bg-white py-8 px-6 shadow-sm rounded-lg border border-gray-200/70 sm:px-10">

      {/* Tabs login / cadastro */}
      {mode !== 'reset' && (
        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === m
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>
      )}

      {/* Reset de senha — título */}
      {mode === 'reset' && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-900">Redefinir senha</h2>
          <p className="text-sm text-gray-500 mt-1">
            Informe seu e-mail e enviaremos um link de redefinição.
          </p>
        </div>
      )}

      {/* Feedback */}
      {success && (
        <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg">
          <p className="text-sm text-teal-800">{success}</p>
          {needsEmailConfirmation && (
            <button
              type="button"
              onClick={() => void handleResendConfirmation()}
              disabled={loading}
              className="mt-2 text-xs font-medium text-teal-900 underline-offset-2 hover:underline disabled:opacity-50"
            >
              Reenviar confirmacao
            </button>
          )}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
          {needsEmailConfirmation && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-red-700">
                Se o e-mail nao chegou, confira spam/lixo eletronico ou solicite um novo envio.
              </p>
              <button
                type="button"
                onClick={() => void handleResendConfirmation()}
                disabled={loading}
                className="text-xs font-medium text-red-800 underline-offset-2 hover:underline disabled:opacity-50"
              >
                Reenviar e-mail de confirmacao
              </button>
            </div>
          )}
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={submitHandler} noValidate className="space-y-4">

        {/* Nome — só no cadastro */}
        {mode === 'login' && (
          <label className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(event) => setRememberDevice(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-700 focus:ring-teal-600"
            />
            <span>
              Lembrar neste dispositivo por 30 dias. Sem isso, a sessao encerra ao fechar o navegador ou apos inatividade.
            </span>
          </label>
        )}

        {mode === 'signup' && (
          <Field label="Nome completo" htmlFor="name">
            <Input
              id="name" type="text" autoComplete="name"
              required placeholder="Seu nome completo"
              value={name} onChange={(v) => setName(v)}
            />
          </Field>
        )}

        {/* E-mail */}
        <Field label="E-mail" htmlFor="email"
          action={mode === 'login'
            ? <button type="button" onClick={() => switchMode('reset')}
                className="text-xs text-teal-700 hover:text-teal-900 transition-colors">
                Esqueceu a senha?
              </button>
            : undefined
          }
        >
          <Input
            id="email" type="email" autoComplete="email"
            required placeholder="seu@email.com"
            value={email} onChange={(v) => setEmail(v)}
          />
        </Field>

        {/* Senha — oculto no modo reset */}
        {mode !== 'reset' && (
          <Field label="Senha" htmlFor="password">
            <Input
              id="password" type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required placeholder={mode === 'signup' ? 'Mínimo 8 caracteres' : '••••••••'}
              value={password} onChange={(v) => setPassword(v)}
            />
          </Field>
        )}

        {/* Termos — só no cadastro */}
        {mode === 'signup' && (
          <p className="text-xs text-gray-500 leading-relaxed">
            Ao criar uma conta você concorda que este app é educacional e
            não substitui orientação médica profissional.
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-teal-800 hover:bg-teal-900
                     disabled:opacity-50 disabled:cursor-not-allowed
                     text-white text-sm font-medium rounded-lg
                     transition-all focus:outline-none focus:ring-2
                     focus:ring-teal-600 focus:ring-offset-2"
        >
          {loading
            ? <Spinner label={mode === 'login' ? 'Entrando…' : mode === 'signup' ? 'Criando conta…' : 'Enviando…'} />
            : mode === 'login'  ? 'Entrar'
            : mode === 'signup' ? 'Criar conta'
            : 'Enviar link de redefinição'
          }
        </button>
      </form>

      {/* Rodapé */}
      <div className="mt-6 text-center text-xs text-gray-400">
        {mode === 'reset' ? (
          <button onClick={() => switchMode('login')}
            className="text-teal-700 hover:text-teal-900 font-medium">
            ← Voltar para o login
          </button>
        ) : mode === 'login' ? (
          <span>Não tem conta?{' '}
            <button onClick={() => switchMode('signup')}
              className="text-teal-700 hover:text-teal-900 font-medium">
              Cadastre-se grátis
            </button>
          </span>
        ) : (
          <span>Já tem conta?{' '}
            <button onClick={() => switchMode('login')}
              className="text-teal-700 hover:text-teal-900 font-medium">
              Faça login
            </button>
          </span>
        )}
      </div>
    </div>
  )
}

// ── Primitivos reutilizáveis ───────────────────────────────────

interface FieldProps {
  label: string
  htmlFor: string
  action?: React.ReactNode
  children: React.ReactNode
}

function Field({ label, htmlFor, action, children }: FieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  )
}

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange: (value: string) => void
}

function Input({ onChange, ...props }: InputProps) {
  return (
    <input
      {...props}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-950
                 placeholder-gray-400 focus:outline-none focus:ring-2
                 focus:ring-teal-600 focus:border-transparent transition-all"
    />
  )
}

function Spinner({ label }: { label: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10"
          stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      {label}
    </span>
  )
}
