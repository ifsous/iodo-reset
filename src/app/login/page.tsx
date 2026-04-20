// src/app/login/page.tsx
// Server Component — sem "use client"
import { Suspense } from 'react'
import LoginForm     from './LoginForm'
import LoginSkeleton from './LoginSkeleton'

export const metadata = {
  title:       'Entrar — Protocolo IODO RESET',
  description: 'Acesse seu protocolo personalizado de suplementação de iodo.',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">

      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-teal-700 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg select-none">IR</span>
          </div>
        </div>
        <h1 className="text-center text-2xl font-semibold text-gray-900">
          Protocolo IODO RESET
        </h1>
        <p className="mt-2 text-center text-sm text-gray-500">
          Seu protocolo personalizado de suplementação
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={<LoginSkeleton />}>
          <LoginForm />
        </Suspense>
        <p className="mt-4 text-center text-xs text-gray-400">
          Conteúdo educacional · Não substitui consulta médica
        </p>
      </div>

    </div>
  )
}
