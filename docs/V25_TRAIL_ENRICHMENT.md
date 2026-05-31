# v25 – Trail enrichment

Adds a lightweight enrichment layer so the app can filter and explain routes by useful practical signals, not only distance and name.

## New data model

`trail_enrichment` stores derived metadata for each published trail:

- nearby parking, toilets, viewpoints, cafes, playgrounds, benches and drinking water
- nearest distance for key facilities
- surface summary
- route kind such as `Kyststi`, `Løype`, `Natursti`, `Skogstur`, `Turvei`, `Sti`
- marked/lit route flags
- simple child/stroller/easy/amenity scores
- JSON summary for UI chips

`trails.enrichment_summary` mirrors the most important fields so existing trail reads can display/filter without joining in every view.

## Run

1. Run SQL migration:

```text
supabase/migrations/202605300019_trail_enrichment.sql
```

2. Enrich published trails:

```bash
npm run trails:enrich
```

3. Check results:

```sql
select route_kind, count(*) from trail_enrichment group by route_kind order by count desc;
select trail_id, surface_summary, has_parking_nearby, has_toilet_nearby, is_marked, is_lit from trail_enrichment limit 25;
```

## UI

Cards now show useful chips like:

- Parkering
- Toalett
- Utsikt
- Merket
- Belyst
- Kafé
- Benker

The `/turer` page supports amenity filters, for example:

```text
/turer?amenity=toilet
/turer?amenity=parking
/turer?amenity=marked
/turer?amenity=lit
```
