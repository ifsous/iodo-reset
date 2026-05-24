create table if not exists public.protocol_progression_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  source text not null check (source in ('auto', 'professional')),
  actor_user_id uuid references public.users(id) on delete set null,
  from_phase text not null check (from_phase in ('0', '1', '2', '3', '4')),
  to_phase text not null check (to_phase in ('0', '1', '2', '3', '4')),
  from_dose_drops integer not null check (from_dose_drops >= 0 and from_dose_drops <= 50),
  to_dose_drops integer not null check (to_dose_drops >= 0 and to_dose_drops <= 50),
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists protocol_progression_events_user_created_idx
  on public.protocol_progression_events(user_id, created_at desc);

create index if not exists protocol_progression_events_source_idx
  on public.protocol_progression_events(source, created_at desc);

alter table public.protocol_progression_events enable row level security;

grant select on public.protocol_progression_events to authenticated;

drop policy if exists "protocol_progression_events: paciente ve seu historico" on public.protocol_progression_events;
create policy "protocol_progression_events: paciente ve seu historico"
  on public.protocol_progression_events for select
  using (user_id = auth.uid());

drop policy if exists "protocol_progression_events: profissional ve pacientes ativos" on public.protocol_progression_events;
create policy "protocol_progression_events: profissional ve pacientes ativos"
  on public.protocol_progression_events for select
  using (
    exists (
      select 1
      from public.professionals pr
      join public.pro_patients pp on pp.professional_id = pr.id
      where pr.user_id = auth.uid()
        and pp.patient_id = protocol_progression_events.user_id
        and pp.status = 'active'
    )
  );
