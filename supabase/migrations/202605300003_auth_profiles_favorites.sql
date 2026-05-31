-- Optional auth tables for v1. Run after 001 and 002.
-- Uses Supabase Auth users from auth.users.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  trail_id text not null references public.trails(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, trail_id)
);

create table if not exists public.accessibility_reports (
  id uuid primary key default gen_random_uuid(),
  trail_id text references public.trails(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  report_type text not null default 'feedback',
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists favorites_user_idx on public.favorites (user_id);
create index if not exists favorites_trail_idx on public.favorites (trail_id);
create index if not exists accessibility_reports_trail_idx on public.accessibility_reports (trail_id);

alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.accessibility_reports enable row level security;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can read own favorites" on public.favorites;
create policy "Users can read own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

drop policy if exists "Users can add own favorites" on public.favorites;
create policy "Users can add own favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own favorites" on public.favorites;
create policy "Users can delete own favorites"
  on public.favorites for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can create accessibility reports" on public.accessibility_reports;
create policy "Users can create accessibility reports"
  on public.accessibility_reports for insert
  with check (auth.uid() = user_id or user_id is null);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
