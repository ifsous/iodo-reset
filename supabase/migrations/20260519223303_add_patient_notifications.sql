create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('pro_invite', 'protocol_update', 'message', 'system')),
  title text not null,
  body text not null,
  action_url text,
  status text not null default 'unread' check (status in ('unread', 'read', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notifications_user_status_idx
  on public.notifications(user_id, status, created_at desc);

create index if not exists notifications_type_idx
  on public.notifications(type, created_at desc);

alter table public.notifications enable row level security;

grant select, update on public.notifications to authenticated;

drop policy if exists "notifications: usuario ve suas notificacoes" on public.notifications;
create policy "notifications: usuario ve suas notificacoes"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "notifications: usuario marca como lida" on public.notifications;
create policy "notifications: usuario marca como lida"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
