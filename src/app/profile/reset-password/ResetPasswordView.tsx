'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordView({
  email,
  requireCurrentPassword,
}: {
  email: string
  requireCurrentPassword: boolean
}) {
  const router = useRouter()
  const supabase = createClient()

  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (requireCurrentPassword && currentPassword.length === 0) {
      setError('Informe sua senha atual.')
      return
    }

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas nao conferem.')
      return
    }

    setLoading(true)

    if (requireCurrentPassword) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })

      if (signInError) {
        setLoading(false)
        setError('Senha atual incorreta.')
        return
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess(true)
  }

  return (
    <div className="min-h-screen bg-[#F7FAF9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-teal-800 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg select-none">IR</span>
          </div>
        </div>
        <h1 className="text-center text-2xl font-semibold text-gray-900">
          {requireCurrentPassword ? 'Alterar senha' : 'Redefinir senha'}
        </h1>
        <p className="mt-2 text-center text-sm text-gray-500">
          {requireCurrentPassword
            ? 'Confirme sua senha atual e defina uma nova senha.'
            : email || 'Digite uma nova senha para sua conta'}
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-lg border border-gray-200/70 sm:px-10">
          {success ? (
            <div className="space-y-4">
              <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg">
                <p className="text-sm text-teal-800">Senha atualizada com sucesso.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  router.push('/dashboard')
                  router.refresh()
                }}
                className="w-full py-2.5 px-4 bg-teal-800 hover:bg-teal-900 text-white text-sm font-medium rounded-lg transition-all"
              >
                Ir para o dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {requireCurrentPassword && (
                <Field label="Senha atual" htmlFor="current-password">
                  <Input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Digite sua senha atual"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                  />
                </Field>
              )}

              <Field label="Nova senha" htmlFor="password">
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Minimo 8 caracteres"
                  value={password}
                  onChange={setPassword}
                />
              </Field>

              <Field label="Confirmar senha" htmlFor="confirm-password">
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                />
              </Field>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
              >
                {loading ? 'Salvando...' : 'Atualizar senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}

function Input({
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  onChange: (value: string) => void
}) {
  return (
    <input
      {...props}
      required
      onChange={(event) => onChange(event.target.value)}
      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-950 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
    />
  )
}
