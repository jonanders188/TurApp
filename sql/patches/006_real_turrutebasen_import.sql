-- Turrute / TurApp v4 real route import foundation
-- Run after earlier patches. This creates a raw import table for Kartverket/Geonorge
-- Turrutebasen WFS and extends trails so app-ready trails can point back to source data.

create extension if not exists pgcrypto;

create table if not exists public.raw_turruter (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'kartverket_turrutebasen_wfs',
  source_id text not null,
  name text,
  route_kind text,
  municipality text,
  properties jsonb not null default '{}'::jsonb,
  geometry_geojson jsonb not null,
  bbox jsonb,
  imported_at timestamptz not null default now(),
  unique (source, source_id)
);

create index if not exists raw_turruter_source_id_idx on public.raw_turruter (source_id);
create index if not exists raw_turruter_municipality_idx on public.raw_turruter (municipality);
create index if not exists raw_turruter_route_kind_idx on public.raw_turruter (route_kind);
create index if not exists raw_turruter_imported_at_idx on public.raw_turruter (imported_at desc);

alter table public.raw_turruter enable row level security;

drop policy if exists "Public can read raw imported routes" on public.raw_turruter;
create policy "Public can read raw imported routes"
  on public.raw_turruter
  for select
  using (true);

alter table public.trails
  add column if not exists source text,
  add column if not exists source_route_id text,
  add column if not exists curated boolean not null default true,
  add column if not exists accessibility_verified_at timestamptz,
  add column if not exists data_quality_note text;

create index if not exists trails_source_route_id_idx on public.trails (source_route_id);
create index if not exists trails_curated_idx on public.trails (curated);

comment on table public.raw_turruter is 'Raw Kartverket/Geonorge Turrutebasen WFS features. Not necessarily app-ready turforslag.';
comment on column public.trails.curated is 'True when content and accessibility tags have been manually reviewed.';
comment on column public.trails.data_quality_note is 'Short warning shown/used internally when route is imported but not fully verified.';
