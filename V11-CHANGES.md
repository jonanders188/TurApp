# V11 – mobil-løft for ruter og kart

## Hva som er forbedret
- **Mobil-først turkort og turdetaljer** med tydeligere CTA-er, større rutevisning og tydelig praktisk info.
- **Interaktivt kart på turdetalj og kartmodus** med OpenStreetMap + stor høy-kontrast rute.
- **Kartmodus for når man faktisk går turen** (`/turer/[slug]/kart`) med egen posisjon på kartet.
- **Bedre thumbnails/rutevisning** med renere og mer lesbare ruteillustrasjoner.
- **Ærlig visning av datakvalitet**: appen sier ifra når rutene bare er skjematiske og ikke detaljert nok for premium navigasjon.

## Viktig produktfunn
Mange av de kuraterte rutene i `curated-vestfold-trails.json` har bare **4–6 koordinatpunkter**. Det er nok til å vise en fin oversikt og selge inn turen, men **ikke nok til å vise en virkelig detaljert og pen rute for navigasjon på mobil**.

For at rutene skal bli så gode som du etterspør, bør datagrunnlaget erstattes eller suppleres med:
- tettere GPX-spor
- eller OSM/Kartverket-geometri med langt flere punkter
- gjerne kuratert start/slutt/waypoints per tur

## Nye/endrede filer
- `components/map/TrailLeafletMap.tsx`
- `components/map/TrailRoutePreview.tsx`
- `components/TrailCard.tsx`
- `app/turer/page.tsx`
- `app/turer/[slug]/page.tsx`
- `app/turer/[slug]/kart/page.tsx`
- `app/kart/page.tsx`
- `lib/geo.ts`
- `app/globals.css`
- `package.json` / `package-lock.json` (Leaflet + react-leaflet)
