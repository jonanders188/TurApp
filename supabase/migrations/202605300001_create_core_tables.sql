-- Turrute / TurApp v1 core database
-- Run this first in Supabase SQL Editor, or with Supabase CLI.

create extension if not exists pgcrypto;

create table if not exists public.trails (
  id text primary key,
  slug text not null unique,
  name text not null,
  municipality text not null,
  area text,
  distance_km numeric(6,2) not null check (distance_km >= 0),
  estimated_minutes integer not null check (estimated_minutes >= 0),
  difficulty text not null,
  route_type text,
  surface_type text,
  elevation_gain_m integer,
  suitable_stroller boolean not null default false,
  suitable_baby_carrier boolean not null default false,
  suitable_wheelchair boolean not null default false,
  suitable_easy_walk boolean not null default false,
  suitable_children boolean not null default false,
  suitable_dog boolean not null default false,
  has_parking boolean not null default false,
  has_toilet boolean not null default false,
  has_viewpoint boolean not null default false,
  tags text[] not null default '{}',
  description text not null,
  image_url text,
  lat numeric(9,6),
  lng numeric(9,6),
  route_geojson jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  message text,
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_email_unique_idx on public.waitlist (lower(email));
create index if not exists trails_municipality_idx on public.trails (municipality);
create index if not exists trails_suitable_stroller_idx on public.trails (suitable_stroller);
create index if not exists trails_suitable_baby_carrier_idx on public.trails (suitable_baby_carrier);
create index if not exists trails_suitable_wheelchair_idx on public.trails (suitable_wheelchair);
create index if not exists trails_suitable_easy_walk_idx on public.trails (suitable_easy_walk);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trails_set_updated_at on public.trails;
create trigger trails_set_updated_at
before update on public.trails
for each row execute function public.set_updated_at();

alter table public.trails enable row level security;
alter table public.waitlist enable row level security;

drop policy if exists "Public can read trails" on public.trails;
create policy "Public can read trails"
  on public.trails
  for select
  using (true);

-- No public select policy for waitlist.
-- Inserts should go through /api/waitlist with server-side key.
