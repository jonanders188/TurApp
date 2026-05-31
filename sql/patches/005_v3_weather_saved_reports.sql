-- Turrute v3 additions
-- Live weather uses MET API through Next.js route and does not need DB tables.
-- Saved trails are stored locally in browser in v3.
-- This patch tightens/supports accessibility report storage.

create table if not exists public.accessibility_reports (
  id uuid primary key default gen_random_uuid(),
  trail_id text references public.trails(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  report_type text not null default 'feedback',
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists accessibility_reports_trail_idx on public.accessibility_reports (trail_id);
create index if not exists accessibility_reports_status_idx on public.accessibility_reports (status);

alter table public.accessibility_reports enable row level security;

-- Reports are inserted through /api/accessibility-report using server key.
-- Authenticated users can see their own reports later if user_id is set.
drop policy if exists "Users can read own reports" on public.accessibility_reports;
create policy "Users can read own reports"
  on public.accessibility_reports
  for select
  using (auth.uid() = user_id);
