# v15 – OSM data warehouse + smart bruk

## Hvorfor

OSM gir mye bedre geometri enn de grove demo-rutene, men OSM er fortsatt rådata. Derfor lagrer vi bredt, scorer og bruker bare det som gir verdi i produktet.

## Ny datamodell

### `osm_raw_elements`

Arkiv for alt vi henter fra Overpass i relevant område. Dette er ikke produktinnhold.

Inneholder:

- `osm_type`, `osm_id`
- `tags`
- `geometry`
- `raw`
- `element_kind`
- `bbox/import_area`

### `osm_route_candidates`

Ruter/stier som kan bli publiserte turer.

Inneholder:

- navn
- lengde
- rutegeometri
- punktantall
- `route_quality`
- `quality_score`
- `published_candidate`
- `rejection_reason`

### `osm_pois`

Praktiske punkter rundt turene.

Eksempler:

- parkering
- toalett
- benk
- utsiktspunkt
- rasteplass
- lekeplass
- kafé
- drikkevann
- badeplass
- kollektivstopp

### `trail_osm_links`

Kobler publiserte `trails` til OSM-kandidaten de bygger på.

## Kommandoer

```bash
npm run osm:import
npm run osm:seed
```

Hvis OSM-rutene ser bedre ut enn de gamle grove rutene:

```bash
npm run osm:seed:replace-demo
```

## Filer som genereres

```text
data/imported/osm-raw-elements.json
data/imported/osm-route-candidates.json
data/imported/osm-pois.json
data/imported/osm-vestfold-trails.json
data/imported/osm-vestfold-rejected.json
```

## Viktig produktregel

Ikke vis rå OSM direkte. Produktvisningen skal bare bruke `trails` der:

- `published=true`
- `curated=true`
- `route_quality` er `usable` eller `detailed`, eller kvalitetsscore er god nok
- ruta har nok punkter og fornuftig lengde

## API

Ny statusroute:

```text
/api/osm/status
```

`/api/amenities` prøver nå først å lese lagrede `osm_pois` fra Supabase. Hvis det ikke finnes lagrede punkter i området, faller den tilbake til live Overpass.
