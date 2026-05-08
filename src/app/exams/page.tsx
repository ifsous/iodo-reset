// src/app/exams/page.tsx
// Server Component — verifica auth e carrega exames do usuário

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ExamsView        from './ExamsView'
import type { ExamType, PlanType } from '@/lib/supabase/types'

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
  file_path:        string | null
  signed_file_url:  string | null
  ai_interpretation: string | null
  ai_interpreted_at: string | null
  ai_model_used:    string | null
  created_at:       string
}

export default async function ExamsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('onboarding_done, plan')
    .eq('id', user.id)
    .single<{ onboarding_done: boolean; plan: PlanType }>()

  if (!userData?.onboarding_done) redirect('/onboarding')

  // Busca todos os exames ordenados por data
  const { data: exams } = await supabase
    .from('exams')
    .select('id, exam_type, exam_label, result_value, result_unit, reference_min, reference_max, is_within_range, exam_date, lab_name, file_url, file_path, ai_interpretation, ai_interpreted_at, ai_model_used, created_at')
    .eq('user_id', user.id)
    .order('exam_date', { ascending: false })

  const examsWithSignedUrls = await Promise.all(
    ((exams ?? []) as Exam[]).map(async (exam) => {
      if (!exam.file_path) return { ...exam, signed_file_url: exam.file_url }

      const { data: signed } = await supabase
        .storage
        .from('exam-files')
        .createSignedUrl(exam.file_path, 60 * 60)

      return {
        ...exam,
        signed_file_url: signed?.signedUrl ?? exam.file_url,
      }
    })
  )

  const isPro = userData.plan === 'pro' || userData.plan === 'clinic'
  const [{ count: diaryAnalysesUsed }, { count: examAnalysesUsed }] = await Promise.all([
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

  return (
    <ExamsView
      userId={user.id}
      exams={examsWithSignedUrls}
      isPro={isPro}
      analysesUsed={(diaryAnalysesUsed ?? 0) + (examAnalysesUsed ?? 0)}
    />
  )
}
