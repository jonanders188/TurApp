-- Turrute v12: OSM route quality fields
-- OSM/Overpass-ruter kan ha langt flere punkter enn demo/kuratert geometri.
-- Disse feltene gjør at appen kan skille mellom kandidat, brukbar og detaljert rute.

alter table public.trails add column if not exists route_quality text;
alter table public.trails add column if not exists route_point_count integer;
alter table public.trails add column if not exists quality_score integer;

create index if not exists trails_route_quality_idx on public.trails (route_quality);
create index if not exists trails_quality_score_idx on public.trails (quality_score desc);
create index if not exists trails_route_point_count_idx on public.trails (route_point_count desc);

-- Ikke slett de gamle kuraterte turene, men merk dem ærlig som grove hvis de mangler punktantall.
update public.trails
set route_quality = coalesce(route_quality, 'rough'),
    route_point_count = coalesce(route_point_count, jsonb_array_length(route_geojson->'coordinates')),
    quality_score = coalesce(quality_score, 40),
    data_quality_note = coalesce(data_quality_note, '') || ' v12: Grov rute. OSM/GPX bør brukes for detaljert mobilnavigasjon.'
where source = 'curated_vestfold_v1'
  and route_geojson is not null;

comment on column public.trails.route_quality is 'hidden/candidate/rough/usable/detailed quality marker for route geometry.';
comment on column public.trails.route_point_count is 'Number of coordinates in route geometry. Mobile navigation usually needs 25+ points, preferably far more.';
comment on column public.trails.quality_score is 'Internal route ranking score used to prefer OSM/GPX-quality routes over rough demo geometry.';
