create table if not exists public.operational_events (
  id uuid primary key default gen_random_uuid(),
  severity text not null check (severity in ('info', 'warning', 'critical')),
  area text not null,
  event_type text not null,
  message text not null,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.operational_events enable row level security;

create index if not exists operational_events_created_at_idx
  on public.operational_events (created_at desc);

create index if not exists operational_events_unresolved_idx
  on public.operational_events (resolved_at, severity, created_at desc);

create index if not exists operational_events_area_idx
  on public.operational_events (area, created_at desc);
