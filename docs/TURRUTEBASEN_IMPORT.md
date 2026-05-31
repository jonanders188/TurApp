# Turrutebasen import for TurApp

This repo now has a v4 import flow for real route geometry from Kartverket/Geonorge Turrutebasen WFS.

The important distinction:

- `raw_turruter` contains raw route features from the public WFS service.
- `trails` contains app-ready trail cards. Imported trails are marked `curated = false` until someone verifies name, access, stroller/wheelchair suitability, surface and practical info.

## 1. Run SQL

Run this after the earlier patches:

```text
sql/patches/006_real_turrutebasen_import.sql
```

## 2. Inspect WFS layers

```bash
npm run turrutebasen:inspect
```

This writes:

```text
data/imported/turrutebasen-capabilities.json
```

## 3. Import Vestfold route geometry

```bash
npm run turrutebasen:import:vestfold
```

This writes raw GeoJSON to:

```text
data/imported/turrutebasen-vestfold.raw.geojson
```

It also writes SQL for `raw_turruter`:

```text
data/imported/seed-raw-turruter.sql
```

## 4. Build app trails from imported routes

```bash
npm run turrutebasen:build-trails
```

This writes:

```text
data/imported/trails.from-turrutebasen.json
data/imported/seed-trails-from-turrutebasen.sql
```

## 5. Seed Supabase

Either paste the generated SQL files into Supabase SQL Editor, or use:

```bash
npm run turrutebasen:seed
```

The seed script uses Supabase REST upserts and requires:

```env
NEXT_PUBLIC_TURRUTE_SUPABASE_URL=
TURRUTE_SUPABASE_SERVICE_ROLE_KEY=
```

## Notes

The WFS service contains real route geometry, but it is not always a finished product-friendly route suggestion. Treat imported data as unverified until curated.

For launch, keep these labels conservative:

- `curated = false`
- `data_quality_note = Importert fra Turrutebasen. Tilgjengelighet er ikke verifisert.`
- accessibility booleans false until checked
