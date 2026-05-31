# Turrute v12: OSM data lift

Dette løftet flytter Turrute mot OpenStreetMap/Overpass som kilde for ruter med mange nok punkter til mobil kartvisning.

## Hvorfor
Dagens utvalgte Vestfold-turer har ofte bare 4–6 koordinatpunkter. Det er nok til å vise en grov oversikt, men ikke godt nok for pen og troverdig mobilnavigasjon.

OSM-ruter og stier kan ha langt tettere geometri. Derfor bør appen importere OSM-kandidater, score dem og kun publisere de som har god nok rutedetalj.

## Ny kommando

```bash
npm run osm:import
npm run osm:seed
```

For å erstatte grove curated-ruter i produktvisningen når gode OSM-ruter er seedet:

```bash
npm run osm:seed:replace-demo
```

## Miljøvariabler

```env
TURRUTE_OSM_BBOX=58.85,9.55,59.75,10.75
TURRUTE_OSM_MIN_POINTS=25
TURRUTE_OSM_MIN_KM=0.8
TURRUTE_OSM_MAX_KM=18
TURRUTE_OVERPASS_URL=https://overpass-api.de/api/interpreter
```

BBOX-format er `south,west,north,east` som Overpass forventer.

## Datakvalitet

Importen lager:

- `data/imported/osm-vestfold-trails.json`
- `data/imported/osm-vestfold-rejected.json`
- `data/imported/osm-overpass-query.txt`

Bare ruter med nok punkter og fornuftig lengde blir OSM-kandidater. De beste får:

```text
published=true
curated=true
source=osm_overpass
route_quality=usable/detailed
route_point_count >= 25
```

## Viktig
OSM er bedre for geometri, men ikke magisk. Ruter må fortsatt godkjennes visuelt før de omtales som anbefalte turer. Importen er derfor en kandidatpipeline, ikke en blind publisering av alt som finnes.
