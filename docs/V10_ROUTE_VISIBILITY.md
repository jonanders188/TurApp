# V10: bedre rutevisning og kart-eksport

Denne patchen gjør at poenget med appen blir tydeligere: brukeren skal se selve turen, ikke bare et startpunkt.

## Endringer

- Trail thumbnails er oppgradert til tydelige rute-kort med start/slutt, lengde, type og nivå.
- Turkort har direkte handlinger:
  - Se tur
  - Google Maps / startpunkt
  - GPX
- Turdetalj har egen kartseksjon med flere eksportvalg.
- Ny side: `/turer/[slug]/kart` for stor rutevisning.
- Ny API-route: `/api/trails/[slug]/gpx` som eksporterer GPX-spor.
- Eksterne kartvalg:
  - Google Maps
  - Apple Maps
  - OpenStreetMap
  - GPX-fil for andre kartapper

## Viktig produktvalg

Google Maps kan ikke alltid vise nøyaktig samme sti som Turrute, spesielt for rundturer, kyststier og stier som Google ikke har i gangnettverket sitt. Derfor er Turrute sin egen rutevisning og GPX-eksport viktig.

Regel:

- Turrute viser faktisk route_geojson.
- Google Maps brukes til directions når ruten er lineær og egnet.
- Google/Apple/OSM brukes ellers til startpunkt.
- GPX brukes for kartapper som støtter import av turspor.
