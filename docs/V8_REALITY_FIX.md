# V8 reality fix

Denne patchen rydder opp i `routeQuality.ts` etter dupliserte/inkompatible helper-funksjoner og gjør live-importen mer robust.

## Endringer

- Rewriter `lib/routeQuality.ts` til én konsistent versjon uten duplicate exports.
- Beholder alle exports som brukes av appen:
  - `classifyTrailMode`
  - `getTrailMode`
  - `isDisplayableTrail`
  - `qualityScore`
  - `cleanImportedRouteName`
  - `describeImportedRoute`
  - `routeKindLabel`
  - `isAppTrailMode`
  - `shouldPublishImportedTrail`
- Støtter både gammel og ny signatur for helpers som live-importen bruker.
- Patch i `lib/turrutebasen-live.ts` slik at live-importen bruker rå Kartverket-kategori (`Fotrute`, `Sykkelrute`, `Skiløype`, `AnnenRute`) og filtrerer med `shouldPublishImportedTrail`.
- TypeScript-sjekk er kjørt med `npx tsc --noEmit` uten feil.

## Etter installasjon

```bash
npm run build
```

Deretter commit/push og kjør dry run på Vercel igjen:

```bash
curl -X POST "https://tur-app-psi.vercel.app/api/import/turrutebasen" \
  -H "content-type: application/json" \
  -H "x-turrute-import-token: DIN_TOKEN" \
  -d '{"dryRun":true}'
```

Når `trailCount` er større enn 0, kjør `dryRun:false`.
