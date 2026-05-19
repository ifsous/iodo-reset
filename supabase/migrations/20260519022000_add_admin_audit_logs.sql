create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text not null,
  action text not null,
  target_user_id uuid references public.users(id) on delete set null,
  target_email text,
  summary text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;

create index if not exists admin_audit_logs_created_at_idx
  on public.admin_audit_logs (created_at desc);

create index if not exists admin_audit_logs_target_user_id_idx
  on public.admin_audit_logs (target_user_id);

create index if not exists admin_audit_logs_actor_user_id_idx
  on public.admin_audit_logs (actor_user_id);
