# v23 – route location labels

This patch improves how OSM/Geofabrik routes are connected to a useful place label.

Instead of relying only on the route start point or a nearest municipality center, the app now:

- samples points along the whole route geometry
- scores broad municipality zones by how much of the route falls inside them
- falls back to bbox center / nearest center only when route geometry is missing
- infers a display area from name, tags and surface, for example `Kyststi`, `Løype`, `Natursti`, `Rundtur`, `Skogstur`, `Turvei` or `Sti`
- shows the result as `Kommune · område/type` above the route name

This is still an MVP inference. The best long-term solution is importing official municipality polygons from Kartverket/SSB and using point-in-polygon during import or in PostGIS.

Run this SQL for existing Supabase rows:

- `supabase/migrations/202605300017_route_location_labels.sql`

Then check:

```sql
select municipality, area, count(*)
from public.trails
where source = 'osm_geofabrik'
group by municipality, area
order by municipality, area;
```
