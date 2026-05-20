create table if not exists public.support_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  user_email text,
  category text not null check (category in ('suggestion', 'criticism', 'support', 'bug', 'app_error')),
  severity text not null default 'normal' check (severity in ('low', 'normal', 'high', 'critical')),
  status text not null default 'new' check (status in ('new', 'in_review', 'resolved', 'closed')),
  title text not null,
  message text not null,
  page_url text,
  user_agent text,
  sentry_event_id text,
  error_digest text,
  metadata jsonb not null default '{}'::jsonb,
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_feedback enable row level security;

grant select, insert, update on public.support_feedback to authenticated;

create index if not exists support_feedback_status_created_at_idx
  on public.support_feedback(status, created_at desc);

create index if not exists support_feedback_category_created_at_idx
  on public.support_feedback(category, created_at desc);

create index if not exists support_feedback_user_created_at_idx
  on public.support_feedback(user_id, created_at desc);

drop policy if exists "support_feedback: usuario cria feedback" on public.support_feedback;
create policy "support_feedback: usuario cria feedback"
  on public.support_feedback for insert
  with check (user_id = auth.uid());

drop policy if exists "support_feedback: usuario ve seus feedbacks" on public.support_feedback;
create policy "support_feedback: usuario ve seus feedbacks"
  on public.support_feedback for select
  using (user_id = auth.uid());
