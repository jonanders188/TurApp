# v7 route classification and cleaner previews

This patch stops treating every imported Turrutebasen line as an ordinary walk.

## What changed

- Demo/local trails are hidden from the product views.
- `AnnenRute`, sea/paddle/boat-like routes and unknown route types are not built as normal app trails.
- App trails are now built only from:
  - `Fotrute` / walking
  - `Sykkelrute` / cycling
  - `Skiløype` / skiing
- Very short route fragments under 1.2 km are removed from the app-facing `trails` table.
- Google Maps is now selective:
  - good linear land routes open with start/end directions
  - loops, unknown, ski/sea/other routes open as directions to start point
- Trail cards have clearer route type labels and better route preview badges.

## SQL patch

Run this after previous patches:

```sql
sql/patches/008_v7_classify_routes_remove_demos.sql
```

or the equivalent migration:

```text
supabase/migrations/202605300008_v7_classify_routes_remove_demos.sql
```

## Rebuild and seed

After applying the code patch:

```bash
npm run turrutebasen:import:vestfold
npm run turrutebasen:build-trails
npm run turrutebasen:seed
```

The builder should now produce fewer, cleaner app trails. In the current imported dataset it produced around 30 app-ready routes from 1005 raw features.

## Important

`raw_turruter` still keeps the raw source data. Only the app-facing `trails` table is cleaned.
