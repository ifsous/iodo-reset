create table if not exists public.pro_invites (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  patient_email text not null,
  patient_id uuid references public.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'active', 'cancelled', 'expired')),
  pro_notes text,
  invite_sent_at timestamptz,
  invite_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pro_invites_professional_id_idx on public.pro_invites(professional_id);
create index if not exists pro_invites_patient_email_idx on public.pro_invites(lower(patient_email));
create unique index if not exists pro_invites_pending_unique_idx
  on public.pro_invites(professional_id, lower(patient_email))
  where status = 'pending';

alter table public.pro_invites enable row level security;

drop policy if exists "pro_invites: profissional cria convite" on public.pro_invites;
create policy "pro_invites: profissional cria convite"
  on public.pro_invites for insert
  with check (
    exists (
      select 1 from public.professionals pr
      where pr.id = pro_invites.professional_id
        and pr.user_id = auth.uid()
    )
  );

drop policy if exists "pro_invites: profissional ve convites" on public.pro_invites;
create policy "pro_invites: profissional ve convites"
  on public.pro_invites for select
  using (
    exists (
      select 1 from public.professionals pr
      where pr.id = pro_invites.professional_id
        and pr.user_id = auth.uid()
    )
  );

drop policy if exists "pro_invites: profissional atualiza convite" on public.pro_invites;
create policy "pro_invites: profissional atualiza convite"
  on public.pro_invites for update
  using (
    exists (
      select 1 from public.professionals pr
      where pr.id = pro_invites.professional_id
        and pr.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.professionals pr
      where pr.id = pro_invites.professional_id
        and pr.user_id = auth.uid()
    )
  );

drop policy if exists "pro_invites: paciente ve convite por email" on public.pro_invites;
create policy "pro_invites: paciente ve convite por email"
  on public.pro_invites for select
  using (lower(patient_email) = lower(coalesce(auth.jwt() ->> 'email', '')));
