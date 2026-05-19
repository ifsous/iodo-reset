create table if not exists public.pro_guidance_history (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  patient_id uuid not null references public.users(id) on delete cascade,
  pro_patient_id uuid references public.pro_patients(id) on delete set null,
  message text not null,
  custom_dose_suggestion integer check (custom_dose_suggestion is null or (custom_dose_suggestion >= 0 and custom_dose_suggestion <= 50)),
  status text not null default 'sent' check (status in ('sent', 'read', 'question', 'responded')),
  patient_feedback text,
  sent_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pro_guidance_history_professional_idx
  on public.pro_guidance_history(professional_id, sent_at desc);

create index if not exists pro_guidance_history_patient_idx
  on public.pro_guidance_history(patient_id, sent_at desc);

create index if not exists pro_guidance_history_status_idx
  on public.pro_guidance_history(status, sent_at desc);

alter table public.pro_guidance_history enable row level security;

grant select on public.pro_guidance_history to authenticated;

drop policy if exists "pro_guidance_history: profissional cria orientacao" on public.pro_guidance_history;
create policy "pro_guidance_history: profissional cria orientacao"
  on public.pro_guidance_history for insert
  with check (
    exists (
      select 1 from public.professionals pr
      where pr.id = pro_guidance_history.professional_id
        and pr.user_id = auth.uid()
    )
  );

drop policy if exists "pro_guidance_history: profissional ve historico" on public.pro_guidance_history;
create policy "pro_guidance_history: profissional ve historico"
  on public.pro_guidance_history for select
  using (
    exists (
      select 1 from public.professionals pr
      where pr.id = pro_guidance_history.professional_id
        and pr.user_id = auth.uid()
    )
  );

drop policy if exists "pro_guidance_history: paciente ve historico" on public.pro_guidance_history;
create policy "pro_guidance_history: paciente ve historico"
  on public.pro_guidance_history for select
  using (patient_id = auth.uid());
