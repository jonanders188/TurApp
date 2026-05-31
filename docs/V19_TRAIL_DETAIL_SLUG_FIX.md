# V19 – Trail detail slug fix

Fixes `/turer/[slug]` so detail pages read directly from Supabase using `published = true` and the requested `slug` or `id`.

Previously `getTrailBySlug()` used `getTrails()` and then searched inside the returned display list. That could fail when the list was filtered, sorted, limited, or fell back to local curated data, even though `/api/trails` returned the correct Geofabrik route.

The detail page now uses the same published Supabase data source as the trail API and only falls back to local curated JSON if Supabase is unavailable.
