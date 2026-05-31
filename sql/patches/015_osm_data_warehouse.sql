-- Turrute v15: OSM data warehouse + smart usage
-- Store OSM broadly as raw data, but only publish/use what passes quality checks.

create table if not exists public.osm_raw_elements (
  id text primary key,
  osm_type text not null,
  osm_id text not null,
  element_kind text,
  import_area text not null default 'vestfold',
  bbox text,
  tags jsonb not null default '{}'::jsonb,
  geometry jsonb,
  raw jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (osm_type, osm_id, import_area)
);

create table if not exists public.osm_route_candidates (
  id text primary key,
  osm_raw_element_id text references public.osm_raw_elements(id) on delete set null,
  osm_type text not null,
  osm_id text not null,
  name text,
  municipality text,
  area text,
  distance_km numeric,
  estimated_minutes integer,
  route_geojson jsonb,
  start_lat double precision,
  start_lng double precision,
  point_count integer not null default 0,
  route_quality text not null default 'candidate',
  quality_score integer not null default 0,
  is_loop boolean not null default false,
  tags jsonb not null default '{}'::jsonb,
  published_candidate boolean not null default false,
  rejection_reason text,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (osm_type, osm_id)
);

create table if not exists public.osm_pois (
  id text primary key,
  osm_raw_element_id text references public.osm_raw_elements(id) on delete set null,
  osm_type text not null,
  osm_id text not null,
  kind text not null,
  label text not null,
  name text,
  lat double precision,
  lng double precision,
  tags jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (osm_type, osm_id, kind)
);

create table if not exists public.trail_osm_links (
  trail_id text references public.trails(id) on delete cascade,
  osm_candidate_id text references public.osm_route_candidates(id) on delete cascade,
  link_type text not null default 'route_geometry',
  confidence numeric not null default 1,
  created_at timestamptz not null default now(),
  primary key (trail_id, osm_candidate_id, link_type)
);

create index if not exists osm_raw_elements_kind_idx on public.osm_raw_elements (element_kind);
create index if not exists osm_raw_elements_tags_gin_idx on public.osm_raw_elements using gin (tags);
create index if not exists osm_route_candidates_quality_idx on public.osm_route_candidates (route_quality, quality_score desc);
create index if not exists osm_route_candidates_published_idx on public.osm_route_candidates (published_candidate, quality_score desc);
create index if not exists osm_route_candidates_points_idx on public.osm_route_candidates (point_count desc);
create index if not exists osm_pois_kind_idx on public.osm_pois (kind);
create index if not exists osm_pois_lat_lng_idx on public.osm_pois (lat, lng);

-- Keep v12 trail quality fields available for trails generated from OSM candidates.
alter table public.trails add column if not exists route_quality text;
alter table public.trails add column if not exists route_point_count integer;
alter table public.trails add column if not exists quality_score integer;

comment on table public.osm_raw_elements is 'Raw OSM/Overpass elements retained as source data. Do not publish directly.';
comment on table public.osm_route_candidates is 'OSM route candidates scored for possible publication as Turrute trails.';
comment on table public.osm_pois is 'Useful OSM points around routes: parking, toilets, benches, viewpoints, playgrounds, cafes etc.';
comment on table public.trail_osm_links is 'Links published trails to the OSM candidates/data they are based on.';
