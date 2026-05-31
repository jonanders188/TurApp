# Turrute / TurApp v2

Første produktdemo av Turrute for Vestfold, bygget med:

- Next.js App Router
- React / TypeScript
- Tailwind
- Supabase
- Resend
- Vercel-ready server routes
- SQL-patcher i repo
- Demo-ruter i GeoJSON (`route_geojson`)

## Hva er nytt i v2

- Mer visuelt UI inspirert av mockupene
- Værkort, filterchips og mer mobilvennlig layout
- Turkort med kart-/ruteillustrasjon
- Turdetaljside med rutevisning
- `route_geojson` i lokal JSON og SQL
- SQL patch `004_add_route_geojson.sql`
- Script `npm run routes:demo`

> Viktig: rutegeometrien er demo-GeoJSON. Den er laget for å vise flyt og UI, ikke som kvalitetssikrede turstier. Erstatt senere med data fra Kartverket/Geonorge, egne GPX/KML-ruter eller kuratert redaksjonelt innhold.

## Kjør lokalt

```bash
npm install
cp .env.example .env.local
npm run dev
```

Åpne:

- http://localhost:3000
- http://localhost:3000/turer
- http://localhost:3000/api/trails

Appen fungerer med lokal JSON fallback selv om Supabase service key ikke er satt.

## Supabase TurApp

Fyll inn `.env.local` med verdier fra Supabase-prosjektet TurApp:

```env
NEXT_PUBLIC_TURRUTE_APP_NAME=Turrute
NEXT_PUBLIC_TURRUTE_SITE_URL=http://localhost:3000

NEXT_PUBLIC_TURRUTE_SUPABASE_URL=https://qmwajaneoohlvyacwerf.supabase.co
NEXT_PUBLIC_TURRUTE_SUPABASE_ANON_KEY=sb_publishable_...
NEXT_PUBLIC_TURRUTE_SUPABASE_SCHEMA=public

TURRUTE_SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

TURRUTE_RESEND_API_KEY=
TURRUTE_FROM_EMAIL=Turrute <hello@example.com>
TURRUTE_WAITLIST_TO_EMAIL=jon@bluestonepim.com
```

`sb_publishable_...` kan ligge i `NEXT_PUBLIC_...`.
`sb_secret_...` må bare ligge server-side og skal ikke pushes til GitHub.

## Etabler tabeller

Kjør SQL i Supabase SQL Editor i denne rekkefølgen:

1. `sql/patches/001_create_core_tables.sql`
2. `sql/patches/002_seed_vestfold_trails.sql`
3. `sql/patches/003_auth_profiles_favorites.sql` valgfri, men anbefalt for login/favoritter
4. `sql/patches/004_add_route_geojson.sql`

Alternativt med Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref qmwajaneoohlvyacwerf
npx supabase db push
```

Migrations ligger også i `supabase/migrations`.

## API

```text
GET  /api/trails
GET  /api/trails?suitable=stroller
GET  /api/trails?suitable=wheelchair
GET  /api/trails?municipality=Larvik
POST /api/waitlist
```

## Datafiler

- `data/trails.vestfold.json` - demo-turer med `route_geojson`
- `data/trails.vestfold.routes.json` - separat ruteoversikt
- `data/trails.vestfold.geojson` - eldre GeoJSON-startpunkter

## Neste steg etter v2

1. Erstatt demo-ruter med ekte rutedata.
2. Legg til Mapbox/MapLibre eller Leaflet for ekte kartfliser.
3. Koble værkortet til MET API.
4. Legg til Supabase Auth og favoritter.
5. Lag adminside for å redigere turer og rutegeometri.

## Viktig før lansering

Turdata og rutegeometri er MVP/demo-data. Kvalitetssikre rullestolvennlighet, barnevognvennlighet, underlag, parkering, toalett, koordinater, lisenser og faktisk rute før offentlig lansering.

## v3: neste nivå

Denne versjonen legger til:

- `/api/weather` som proxy mot MET Locationforecast.
- Live værkort på turdetaljsiden.
- Lokalt lagrede turer på `/lagrede`.
- “Meld fra om turen”-skjema for tilgjengelighet/underlag/feil.
- SQL-patch `005_v3_weather_saved_reports.sql`.

### Kjør lokalt

```bash
npm install
cp .env.example .env.local
npm run dev
```

Åpne:

```text
http://localhost:3000
http://localhost:3000/turer
http://localhost:3000/lagrede
```

### MET API

Sett en tydelig User-Agent i `.env.local`:

```env
TURRUTE_MET_USER_AGENT=Turrute MVP din-epost@example.com
```

### Supabase

Kjør SQL-patchene i rekkefølge i Supabase SQL Editor, inkludert:

```text
sql/patches/005_v3_weather_saved_reports.sql
```

## v4: ekte Turrutebasen-import

Denne versjonen har scripts for å hente ekte rutegeometri fra Kartverket/Geonorge Turrutebasen WFS.

Kjør først SQL-patch i Supabase:

```text
sql/patches/006_real_turrutebasen_import.sql
```

Importer og bygg app-turer:

```bash
npm run turrutebasen:inspect
npm run turrutebasen:import:vestfold
npm run turrutebasen:build-trails
```

Deretter lim inn disse genererte SQL-filene i Supabase SQL Editor:

```text
data/imported/seed-raw-turruter.sql
data/imported/seed-trails-from-turrutebasen.sql
```

Se `docs/TURRUTEBASEN_IMPORT.md` for hele flyten.

## v5: levende Turrutebasen-ruter

Denne pakken legger til ekte ruteimport og kartvisning:

```bash
npm run dev
```

Åpne:

```text
http://localhost:3000/kart
http://localhost:3000/admin/import
```

Kjør SQL-patchene i Supabase:

```text
sql/patches/006_real_turrutebasen_import.sql
sql/patches/007_live_turrutebasen_app_integration.sql
```

Importer ekte ruter lokalt:

```bash
npm run turrutebasen:import:vestfold
npm run turrutebasen:build-trails
npm run turrutebasen:seed
```

Alternativt via API mens dev-server kjører:

```bash
npm run turrutebasen:live-api:dry-run
npm run turrutebasen:live-api
```

Se `docs/LIVE_TURRUTER.md` for detaljer.

## v7: cleaner real routes

v7 removes demo/local trails from the product views and stops showing `AnnenRute` as normal walking routes. Run:

```bash
npm run turrutebasen:import:vestfold
npm run turrutebasen:build-trails
npm run turrutebasen:seed
```

Then run SQL patch `008_v7_classify_routes_remove_demos.sql` if you have not already done so.
