-- Turrute / TurApp v5 live route integration
-- Run after 006_real_turrutebasen_import.sql.
-- Adds import run tracking and a small view that makes it easier to inspect live imported routes.

create extension if not exists pgcrypto;

create table if not exists public.import_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null default 'started',
  bbox text,
  feature_count integer not null default 0,
  trail_count integer not null default 0,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists import_runs_source_created_idx on public.import_runs (source, created_at desc);

alter table public.import_runs enable row level security;

drop policy if exists "Public can read import runs" on public.import_runs;
create policy "Public can read import runs"
  on public.import_runs
  for select
  using (true);

alter table public.trails
  add column if not exists source text,
  add column if not exists source_route_id text,
  add column if not exists curated boolean not null default true,
  add column if not exists accessibility_verified_at timestamptz,
  add column if not exists data_quality_note text;

create index if not exists trails_source_idx on public.trails (source);
create index if not exists trails_source_route_id_idx on public.trails (source_route_id);
create index if not exists trails_route_geojson_gin_idx on public.trails using gin (route_geojson);

create or replace view public.live_imported_trails as
select
  id,
  slug,
  name,
  municipality,
  area,
  distance_km,
  estimated_minutes,
  difficulty,
  route_type,
  route_geojson,
  lat,
  lng,
  source,
  source_route_id,
  curated,
  data_quality_note,
  updated_at
from public.trails
where source = 'kartverket_turrutebasen_wfs'
  and route_geojson is not null;

comment on table public.import_runs is 'Import log for live Kartverket/Geonorge Turrutebasen imports.';
comment on view public.live_imported_trails is 'App-visible trails created from live Turrutebasen imports.';
