-- v24: Correct obvious east-side Oslofjord labels created by earlier coarse bbox logic.
-- This is intentionally conservative. The app also recalculates display labels from
-- route geometry at runtime, so this only cleans the database text for common cases.

update public.trails
set municipality = 'Vestby'
where source = 'osm_geofabrik'
  and lat between 59.46 and 59.75
  and lng between 10.55 and 10.95;

update public.trails
set municipality = 'Moss'
where source = 'osm_geofabrik'
  and lat between 59.28 and 59.55
  and lng between 10.55 and 10.88
  and not (lat between 59.46 and 59.75 and lng between 10.55 and 10.95);

update public.trails
set area = case
  when lower(coalesce(name, '') || ' ' || array_to_string(tags, ' ')) ~ 'kyststi|kyst|fjord|strand|svaberg|promenade' then 'Kyststi'
  when lower(coalesce(name, '') || ' ' || array_to_string(tags, ' ')) ~ 'lysløype|lysløypa|løype|løypa|rundløype|skiløype' then 'Løype'
  when lower(coalesce(name, '') || ' ' || array_to_string(tags, ' ')) ~ 'natursti|eventyrsti|eventyrstien' then 'Natursti'
  when lower(coalesce(name, '') || ' ' || array_to_string(tags, ' ')) ~ 'runden|runde|rundtur' then 'Rundtur'
  when lower(coalesce(name, '') || ' ' || array_to_string(tags, ' ')) ~ 'kollen|åsen|knatten|fjell|heia|utsikt' then 'Ås og utsikt'
  when lower(coalesce(name, '') || ' ' || array_to_string(tags, ' ')) ~ 'skogen|skog|marka' then 'Skogstur'
  when lower(coalesce(name, '') || ' ' || array_to_string(tags, ' ')) ~ 'gravel|fine_gravel|compacted|grus|track' then 'Turvei'
  when lower(coalesce(name, '') || ' ' || array_to_string(tags, ' ')) ~ 'path|sti|stien|trailblazed' then 'Sti'
  else area
end
where source = 'osm_geofabrik'
  and (area is null or area = '');
