-- v25: Enriched route metadata for useful filtering and better choice cards.

create table if not exists public.trail_enrichment (
  trail_id text primary key references public.trails(id) on delete cascade,
  surface_summary text,
  route_kind text,
  is_marked boolean not null default false,
  is_lit boolean not null default false,
  has_parking_nearby boolean not null default false,
  parking_distance_m integer,
  has_toilet_nearby boolean not null default false,
  toilet_distance_m integer,
  has_viewpoint_nearby boolean not null default false,
  viewpoint_distance_m integer,
  has_cafe_nearby boolean not null default false,
  cafe_distance_m integer,
  has_playground_nearby boolean not null default false,
  playground_distance_m integer,
  bench_count integer not null default 0,
  drinking_water_count integer not null default 0,
  amenity_score integer not null default 0,
  child_score integer not null default 0,
  stroller_score integer not null default 0,
  easy_score integer not null default 0,
  confidence_score integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists trail_enrichment_route_kind_idx on public.trail_enrichment(route_kind);
create index if not exists trail_enrichment_parking_idx on public.trail_enrichment(has_parking_nearby);
create index if not exists trail_enrichment_toilet_idx on public.trail_enrichment(has_toilet_nearby);
create index if not exists trail_enrichment_marked_idx on public.trail_enrichment(is_marked);
create index if not exists trail_enrichment_lit_idx on public.trail_enrichment(is_lit);

alter table public.trails
  add column if not exists enrichment_summary jsonb not null default '{}'::jsonb;
