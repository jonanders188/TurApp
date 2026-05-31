-- Turrute / TurApp v2 demo route geometry
-- Adds GeoJSON LineString route data used by the map preview.

alter table public.trails
  add column if not exists route_geojson jsonb;

update public.trails set route_geojson = '{"type": "LineString", "coordinates": [[10.4071, 59.0529], [10.4086, 59.0536], [10.4107, 59.053], [10.4118, 59.0519], [10.4098, 59.0512], [10.4076, 59.0519], [10.4071, 59.0529]]}'::jsonb where id = 'verdens-ende';
update public.trails set route_geojson = '{"type": "LineString", "coordinates": [[10.0273, 59.0551], [10.0285, 59.0559], [10.03, 59.0562], [10.031, 59.0552], [10.0302, 59.0541], [10.0283, 59.054], [10.0273, 59.0551]]}'::jsonb where id = 'bokeskogen-larvik';
update public.trails set route_geojson = '{"type": "LineString", "coordinates": [[10.4858, 59.4239], [10.4876, 59.4243], [10.4888, 59.4254], [10.49, 59.4249], [10.4898, 59.4231], [10.4873, 59.4226], [10.4858, 59.4239]]}'::jsonb where id = 'karljohansvern';
update public.trails set route_geojson = '{"type": "LineString", "coordinates": [[9.8268, 58.9692], [9.8278, 58.9699], [9.8295, 58.9701], [9.8311, 58.9693], [9.8316, 58.9681], [9.8291, 58.9678], [9.827, 58.9686]]}'::jsonb where id = 'molen';
update public.trails set route_geojson = '{"type": "LineString", "coordinates": [[10.3672, 59.2739], [10.3682, 59.2741], [10.37, 59.2742], [10.3712, 59.2738], [10.3707, 59.2732], [10.3684, 59.2733], [10.3672, 59.2739]]}'::jsonb where id = 'ilene-naturreservat';
update public.trails set route_geojson = '{"type": "LineString", "coordinates": [[10.4665, 59.3831], [10.4676, 59.3839], [10.4691, 59.3841], [10.4704, 59.3835], [10.4699, 59.3823], [10.4676, 59.3821], [10.4665, 59.3831]]}'::jsonb where id = 'borrehaugene';
update public.trails set route_geojson = '{"type": "LineString", "coordinates": [[10.3172, 59.4881], [10.3187, 59.4881], [10.3202, 59.4883], [10.3217, 59.4882], [10.3232, 59.4879]]}'::jsonb where id = 'holmestrand-fjordpromenade';
update public.trails set route_geojson = '{"type": "LineString", "coordinates": [[10.2242, 59.1244], [10.225, 59.1251], [10.2258, 59.1248], [10.2264, 59.1241], [10.2253, 59.1235], [10.224, 59.1242], [10.2242, 59.1244]]}'::jsonb where id = 'midtasen';
