# V16 Geofabrik OSM-import

Live Overpass fungerer dårlig til bulkimport: store bbox-spørringer gir 504/406/DNS-feil og uforutsigbar geometri. V16 bytter derfor standard `npm run osm:import` til en lokal Geofabrik/PBF-basert import.

## Krever

```bash
brew install osmium-tool
```

## Standard flyt

```bash
npm run osm:import
npm run osm:seed
```

Første kjøring laster ned `norway-latest.osm.pbf` til `data/imported/norway-latest.osm.pbf`. Det kan ta tid og filen er stor. Senere kjøringer gjenbruker filen.

## Viktige env-vars

```bash
TURRUTE_OSM_PBF_URL=https://download.geofabrik.de/europe/norway-latest.osm.pbf
TURRUTE_OSM_PBF_PATH=data/imported/norway-latest.osm.pbf
TURRUTE_OSM_BBOX=58.85,9.55,59.75,10.75
TURRUTE_OSM_MIN_POINTS=25
TURRUTE_OSM_MIN_KM=0.8
TURRUTE_OSM_MAX_KM=18
```

BBOX-format er `south,west,north,east`.

## Hvorfor dette er bedre

- ingen live Overpass-timeouts for bulkimport
- ekte way-geometri fra OSM PBF
- alle relevante raw features, POI-er og route candidates kan lagres
- appen publiserer bare kandidater med nok punkter/lengde/kvalitet

## Overpass beholdes

Den gamle Overpass-importen er beholdt som:

```bash
npm run osm:overpass:import
```

Bruk den kun til små tester, ikke bulkimport.
