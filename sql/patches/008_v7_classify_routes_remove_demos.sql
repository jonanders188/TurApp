alter table public.trails add column if not exists trail_mode text;

-- v7: classify real app routes and remove demo/unknown routes from product table.
-- Keeps raw_turruter as raw source archive.

-- Remove older demo/local rows from the app-facing table.
delete from public.trails
where source is null
   or source = 'local-json'
   or source = 'demo';

-- Remove imported rows that should not be shown as ordinary land-based trips.
delete from public.trails
where source in ('kartverket_turrutebasen_wfs', 'kartverket_turrutebasen_live')
  and (
    distance_km < 1.2
    or route_type in ('Turrute', 'Annen rute', 'Sjø-/padlerute')
    or name ilike 'http%'
  );

-- Make display tags more honest for imported app-routes.
update public.trails
set tags = array_remove(tags, 'Båt')
where source in ('kartverket_turrutebasen_wfs', 'kartverket_turrutebasen_live');

update public.trails
set data_quality_note = coalesce(data_quality_note, '') || ' v7: Demo-ruter og AnnenRute/ukjent/sjø-ruter er skjult fra vanlig turliste.'
where source in ('kartverket_turrutebasen_wfs', 'kartverket_turrutebasen_live')
  and coalesce(data_quality_note, '') not ilike '%v7:%';
