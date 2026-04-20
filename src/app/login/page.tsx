'use client'
// src/app/login/page.tsx
// useSearchParams() requer Suspense boundary no Next.js 16

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'signup'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  useEffect(() => {
    const callbackError = searchParams.get('error')
    if (callbackError === 'auth_callback_error') {
      setError('Link de confirmação inválido ou expirado. Tente novamente.')
    }
  }, [searchParams])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) { setError(translateError(error.message)); setLoading(false); return }
    router.push(redirectTo)
    router.refresh()
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); setLoading(false); return }
    const { error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError(translateError(error.message)); setLoading(false); return }
    setSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
    setLoading(false)
  }

  async function handlePasswordReset() {
    if (!email.trim()) { setError('Digite seu e-mail para redefinir a senha.'); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/profile/reset-password`,
    })
    if (error) { setError(translateError(error.message)) } else { setSuccess('E-mail de redefinição enviado.') }
    setLoading(false)
  }

  function translateError(msg: string): string {
    const map: Record<string, string> = {
      'Invalid login credentials': 'E-mail ou senha incorretos.',
      'Email not confirmed': 'Confirme seu e-mail antes de fazer login.',
      'User already registered': 'Este e-mail já está cadastrado.',
      'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos.',
    }
    for (const [key, value] of Object.entries(map)) { if (msg.includes(key)) return value }
    return 'Ocorreu um erro. Tente novamente.'
  }

  function switchMode(newMode: Mode) { setMode(newMode); setError(null); setSuccess(null) }

  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-md">
      <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-gray-100 sm:px-10">
        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button type="button" onClick={() => switchMode('login')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            Entrar
          </button>
          <button type="button" onClick={() => switchMode('signup')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'signup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            Criar conta
          </button>
        </div>

        {success && <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg"><p className="text-sm text-teal-800">{success}</p></div>}
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-700">{error}</p></div>}

        <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
              <input id="name" type="text" autoComplete="name" required value={name}
                onChange={(e) => setName(e.target.value)} placeholder="Seu nome"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input id="email" type="email" autoComplete="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Senha</label>
              {mode === 'login' && (
                <button type="button" onClick={handlePasswordReset} className="text-xs text-teal-700 hover:text-teal-900">
                  Esqueceu a senha?
                </button>
              )}
            </div>
            <input id="password" type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Mínimo 8 caracteres' : '••••••••'}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
          </div>
          {mode === 'signup' && (
            <p className="text-xs text-gray-500 leading-relaxed">
              Ao criar uma conta, você concorda que este app é um recurso educacional e não substitui orientação médica profissional.
            </p>
          )}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                {mode === 'login' ? 'Entrando...' : 'Criando conta...'}
              </span>
            ) : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            {mode === 'login' ? (
              <> Não tem conta?{' '}<button onClick={() => switchMode('signup')} className="text-teal-700 hover:text-teal-900 font-medium">Cadastre-se grátis</button> </>
            ) : (
              <> Já tem conta?{' '}<button onClick={() => switchMode('login')} className="text-teal-700 hover:text-teal-900 font-medium">Faça login</button> </>
            )}
          </p>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-gray-400">Conteúdo educacional · Não substitui consulta médica</p>
    </div>
  )
}

function LoginSkeleton() {
  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-md">
      <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-gray-100 sm:px-10">
        <div className="h-10 bg-gray-100 rounded-lg mb-6 animate-pulse" />
        <div className="space-y-4">
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-teal-700 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">IR</span>
          </div>
        </div>
        <h1 className="text-center text-2xl font-semibold text-gray-900">Protocolo IODO RESET</h1>
        <p className="mt-2 text-center text-sm text-gray-500">Seu protocolo personalizado de suplementação</p>
      </div>
      <Suspense fallback={<LoginSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
