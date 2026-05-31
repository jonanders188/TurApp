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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trails_municipality_idx on public.trails (municipality);
create index if not exists trails_suitable_stroller_idx on public.trails (suitable_stroller);
create index if not exists trails_suitable_wheelchair_idx on public.trails (suitable_wheelchair);
create index if not exists trails_suitable_easy_walk_idx on public.trails (suitable_easy_walk);

alter table public.trails enable row level security;

drop policy if exists "Public can read trails" on public.trails;
create policy "Public can read trails"
  on public.trails
  for select
  using (true);
