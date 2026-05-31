# Levende turer i Turrute

Denne versjonen gjør at ekte ruter fra Kartverket/Geonorge Turrutebasen kan bli synlige i appen og på `/kart`.

## Hva som er nytt

- `/kart` viser alle turer med `route_geojson` som linjer på et samlet kart.
- `/admin/import` viser importstatus og kommandoer.
- `/api/import/status` viser antall rådata-ruter og app-turer i Supabase.
- `/api/import/turrutebasen` kan hente ruter fra WFS og upserte dem i Supabase.
- `raw_turruter` lagrer rå rutedata.
- `trails` får app-klare turer med ekte `route_geojson`.
- `import_runs` logger importkjøringer.

## 1. Kjør SQL først

Kjør disse i Supabase SQL Editor hvis de ikke allerede er kjørt:

```text
sql/patches/006_real_turrutebasen_import.sql
sql/patches/007_live_turrutebasen_app_integration.sql
```

## 2. Miljøvariabler

I `.env.local` trenger du minst:

```env
NEXT_PUBLIC_TURRUTE_SITE_URL=http://localhost:3000
NEXT_PUBLIC_TURRUTE_SUPABASE_URL=https://qmwajaneoohlvyacwerf.supabase.co
NEXT_PUBLIC_TURRUTE_SUPABASE_ANON_KEY=sb_publishable_...
NEXT_PUBLIC_TURRUTE_SUPABASE_SCHEMA=public
TURRUTE_SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
TURRUTE_IMPORT_USER_AGENT=TurApp import jon@bluestonepim.com
TURRUTE_IMPORT_ADMIN_TOKEN=lag-en-lang-hemmelig-token
```

Ikke legg `sb_secret_...` eller import-token i Git.

## 3. Trygg lokal import via scripts

Dette er anbefalt under utvikling:

```bash
npm run turrutebasen:import:vestfold
npm run turrutebasen:build-trails
npm run turrutebasen:seed
```

Deretter åpner du:

```text
http://localhost:3000/kart
http://localhost:3000/turer
```

## 4. Live import via Next API

Start dev-server:

```bash
npm run dev
```

Kjør dry-run først:

```bash
npm run turrutebasen:live-api:dry-run
```

Kjør import:

```bash
npm run turrutebasen:live-api
```

Eller direkte med curl:

```bash
curl -X POST http://localhost:3000/api/import/turrutebasen \
  -H 'Content-Type: application/json' \
  -H 'x-turrute-import-token: DIN_TOKEN' \
  -d '{"maxFeaturesPerLayer":80,"maxTrails":60,"maxLayers":5}'
```

## 5. Viktig datakvalitet

Turrutebasen gir ekte rutegeometri, men ikke nødvendigvis ferdige turforslag med kvalitetssikret barnevogn/rullestol/underlag.

Derfor importeres slike turer med:

```text
curated = false
data_quality_note = Ekte rutegeometri, men tilgjengelighet ikke verifisert
```

Før offentlig lansering bør dere kuratere de beste rutene og oppdatere:

- navn
- beskrivelse
- underlag
- barnevogn/rullestol/bæremeis
- parkering
- toalett
- bilder
- praktiske tips
