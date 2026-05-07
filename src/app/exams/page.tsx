// src/app/exams/page.tsx
// Server Component — verifica auth e carrega exames do usuário

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ExamsView        from './ExamsView'
import type { ExamType } from '@/lib/supabase/types'

export const metadata = {
  title: 'Exames — IODO RESET',
}

export interface Exam {
  id:               string
  exam_type:        ExamType
  exam_label:       string | null
  result_value:     number | null
  result_unit:      string | null
  reference_min:    number | null
  reference_max:    number | null
  is_within_range:  boolean | null
  exam_date:        string
  lab_name:         string | null
  file_url:         string | null
  ai_interpretation: string | null
  created_at:       string
}

export default async function ExamsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('onboarding_done')
    .eq('id', user.id)
    .single<{ onboarding_done: boolean }>()

  if (!userData?.onboarding_done) redirect('/onboarding')

  // Busca todos os exames ordenados por data
  const { data: exams } = await supabase
    .from('exams')
    .select('id, exam_type, exam_label, result_value, result_unit, reference_min, reference_max, is_within_range, exam_date, lab_name, file_url, ai_interpretation, created_at')
    .eq('user_id', user.id)
    .order('exam_date', { ascending: false })

  return (
    <ExamsView
      userId={user.id}
      exams={(exams ?? []) as Exam[]}
    />
  )
}
