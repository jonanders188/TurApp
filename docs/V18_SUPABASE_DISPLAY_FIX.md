# V18 – Supabase published routes are the display source

Fixes a display bug where the app could fall back to `data/curated-vestfold-trails.json` even though Supabase had published Geofabrik routes.

## What changed

- `getTrails()` now reads Supabase when either admin env or public anon env is available.
- It fetches `published=true` rows from Supabase first.
- If Supabase has any published rows, Supabase remains the source of truth even when UI filters return zero matches.
- Local curated JSON is only used when Supabase cannot be read or has no published trails.
- This prevents old `curated_vestfold_v1` rough/demo routes from reappearing in the UI.

## Expected behavior

With the current DB state, the app should show `osm_geofabrik` published trails such as `Nordbykollrunden`, `Eventyrstien`, `Kyststien`, etc. The old rough curated routes remain unpublished and should not be shown.
