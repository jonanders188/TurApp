-- v23: Better location labels for OSM/Geofabrik routes.
-- This is an MVP inference: use broad municipality zones and route/name/tag clues.
-- App-side inference still runs at read time, so this SQL is only for making existing rows easier to inspect/filter.

update public.trails
set municipality = case
  when lat between 58.86 and 59.25 and lng between 10.28 and 10.68 then 'Færder'
  when lat between 58.82 and 59.18 and lng between 9.65 and 10.32 then 'Larvik'
  when lat between 59.02 and 59.30 and lng between 10.00 and 10.42 then 'Sandefjord'
  when lat between 59.18 and 59.39 and lng between 10.16 and 10.58 then 'Tønsberg'
  when lat between 59.32 and 59.54 and lng between 10.28 and 10.72 then 'Horten'
  when lat between 59.35 and 59.74 and lng between 9.88 and 10.45 then 'Holmestrand'
  when lat between 59.02 and 59.23 and lng between 9.50 and 9.88 then 'Porsgrunn'
  when lat between 59.14 and 59.36 and lng between 9.45 and 9.85 then 'Skien'
  when lat between 58.82 and 59.12 and lng between 9.45 and 9.95 then 'Bamble'
  when lat between 59.20 and 59.42 and lng between 9.55 and 9.88 then 'Siljan'
  when lat between 59.54 and 59.78 and lng between 9.35 and 9.86 then 'Kongsberg'
  when lat between 59.62 and 59.86 and lng between 9.98 and 10.45 then 'Drammen'
  else municipality
end
where source = 'osm_geofabrik'
  and lat is not null
  and lng is not null
  and (municipality is null or municipality = '' or municipality in ('Vestfold', 'Vestfold og Telemark', 'Telemark'));

update public.trails
set area = case
  when lower(name || ' ' || array_to_string(tags, ' ') || ' ' || coalesce(surface_type, '')) ~ 'kyststi|kyst|fjord|strand|svaberg|promenade' then 'Kyststi'
  when lower(name || ' ' || array_to_string(tags, ' ') || ' ' || coalesce(surface_type, '')) ~ 'lysløype|lysløypa|løype|løypa|rundløype|skiløype' then 'Løype'
  when lower(name || ' ' || array_to_string(tags, ' ') || ' ' || coalesce(surface_type, '')) ~ 'natursti|eventyrsti|eventyrstien' then 'Natursti'
  when lower(name || ' ' || array_to_string(tags, ' ') || ' ' || coalesce(route_type, '')) ~ 'runden|runde|rundtur' then 'Rundtur'
  when lower(name || ' ' || array_to_string(tags, ' ') || ' ' || coalesce(surface_type, '')) ~ 'kollen|åsen|knatten|fjell|heia|utsikt' then 'Ås og utsikt'
  when lower(name || ' ' || array_to_string(tags, ' ') || ' ' || coalesce(surface_type, '')) ~ 'skogen|skog|marka' then 'Skogstur'
  when lower(name || ' ' || array_to_string(tags, ' ') || ' ' || coalesce(surface_type, '')) ~ 'gravel|fine_gravel|compacted|grus|track' then 'Turvei'
  when lower(name || ' ' || array_to_string(tags, ' ') || ' ' || coalesce(surface_type, '')) ~ 'path|sti|stien' then 'Sti'
  else area
end
where source = 'osm_geofabrik'
  and (area is null or area = '' or area = 'Vestfold');

update public.osm_route_candidates
set municipality = case
  when start_lat between 58.86 and 59.25 and start_lng between 10.28 and 10.68 then 'Færder'
  when start_lat between 58.82 and 59.18 and start_lng between 9.65 and 10.32 then 'Larvik'
  when start_lat between 59.02 and 59.30 and start_lng between 10.00 and 10.42 then 'Sandefjord'
  when start_lat between 59.18 and 59.39 and start_lng between 10.16 and 10.58 then 'Tønsberg'
  when start_lat between 59.32 and 59.54 and start_lng between 10.28 and 10.72 then 'Horten'
  when start_lat between 59.35 and 59.74 and start_lng between 9.88 and 10.45 then 'Holmestrand'
  else municipality
end
where start_lat is not null
  and start_lng is not null
  and (municipality is null or municipality = '' or municipality in ('Vestfold', 'Vestfold og Telemark', 'Telemark'));
