# V6: live import fra UI

Denne patchen flytter Turrutebasen-importen fra ren terminalflyt til app/server-route.

## Hva er nytt

- `/admin/import` har nå et UI for å teste og kjøre import.
- `/api/import/turrutebasen` bruker GML/XML-parser, fordi Kartverket WFS ikke leverer GeoJSON/JSON.
- Importen filtrerer bort korte segmenter under `1 km`.
- Importerte ruter får bedre fallback-titler og beskrivelser.
- `/turer` filtrerer bort rå/importerte segmenter som ikke egner seg som app-turer.
- Turdetalj har Google Maps-lenke som bruker start, slutt og waypoints fra `route_geojson`.

## Lokal bruk

1. Sørg for `.env.local`:

```env
NEXT_PUBLIC_TURRUTE_SUPABASE_URL=https://qmwajaneoohlvyacwerf.supabase.co
NEXT_PUBLIC_TURRUTE_SUPABASE_ANON_KEY=sb_publishable_...
TURRUTE_SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
TURRUTE_IMPORT_USER_AGENT=TurApp import jon@bluestonepim.com
TURRUTE_IMPORT_ADMIN_TOKEN=lag-en-lang-hemmelig-token
```

2. Start appen:

```bash
npm run dev
```

3. Åpne:

```text
http://localhost:3000/admin/import
```

4. Kjør først `Dry run`, og kjør deretter import til Supabase når tallene ser riktige ut.

## Terminal-backup

```bash
npm run turrutebasen:import:vestfold
npm run turrutebasen:build-trails
npm run turrutebasen:seed
```

## Viktig

Importerte ruter er ekte rutegeometri fra Kartverket/Geonorge Turrutebasen, men tilgjengelighet er ikke verifisert. De vises derfor med `Ikke verifisert`.
