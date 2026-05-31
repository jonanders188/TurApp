create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  message text,
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_email_unique_idx on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

-- Intentionally no public select policy.
-- Inserts should go through /api/waitlist using the service role key.
