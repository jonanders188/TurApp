-- v22: Fill municipality for existing OSM/Geofabrik rows by nearest municipality center.
-- This is a pragmatic fallback when OSM tags do not contain addr:municipality.

with municipality_centers(name, lat, lng) as (
  values
    ('Horten', 59.4172::double precision, 10.4834::double precision),
    ('Holmestrand', 59.4876, 10.3176),
    ('Tønsberg', 59.2675, 10.4076),
    ('Færder', 59.1902, 10.4264),
    ('Sandefjord', 59.1312, 10.2166),
    ('Larvik', 59.0533, 10.0352),
    ('Porsgrunn', 59.1405, 9.6561),
    ('Skien', 59.2096, 9.6090),
    ('Bamble', 59.0018, 9.7457),
    ('Siljan', 59.2826, 9.7109),
    ('Kongsberg', 59.6686, 9.6502),
    ('Drammen', 59.7439, 10.2045)
)
update public.trails t
set municipality = nearest.name,
    updated_at = now()
from lateral (
  select m.name
  from municipality_centers m
  where t.lat is not null and t.lng is not null
  order by power(t.lat::double precision - m.lat, 2) + power(t.lng::double precision - m.lng, 2)
  limit 1
) nearest
where t.source = 'osm_geofabrik'
  and lower(coalesce(t.municipality, '')) in ('', 'vestfold', 'vestfold og telemark', 'telemark', 'norway', 'norge', 'ukjent', 'unknown');

with municipality_centers(name, lat, lng) as (
  values
    ('Horten', 59.4172::double precision, 10.4834::double precision),
    ('Holmestrand', 59.4876, 10.3176),
    ('Tønsberg', 59.2675, 10.4076),
    ('Færder', 59.1902, 10.4264),
    ('Sandefjord', 59.1312, 10.2166),
    ('Larvik', 59.0533, 10.0352),
    ('Porsgrunn', 59.1405, 9.6561),
    ('Skien', 59.2096, 9.6090),
    ('Bamble', 59.0018, 9.7457),
    ('Siljan', 59.2826, 9.7109),
    ('Kongsberg', 59.6686, 9.6502),
    ('Drammen', 59.7439, 10.2045)
)
update public.osm_route_candidates c
set municipality = nearest.name,
    updated_at = now()
from lateral (
  select m.name
  from municipality_centers m
  where c.start_lat is not null and c.start_lng is not null
  order by power(c.start_lat::double precision - m.lat, 2) + power(c.start_lng::double precision - m.lng, 2)
  limit 1
) nearest
where lower(coalesce(c.municipality, '')) in ('', 'vestfold', 'vestfold og telemark', 'telemark', 'norway', 'norge', 'ukjent', 'unknown');
