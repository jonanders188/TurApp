# V16 Geofabrik RangeError fix

Fixes `RangeError: Invalid string length` during `npm run osm:import`.

The import previously exported the Vestfold PBF to one large GeoJSON file, parsed all features, then wrote `osm-raw-elements.json` with a full nested copy of every raw GeoJSON feature. That duplicated a very large dataset and could exceed Node's max string size when `JSON.stringify` ran.

The import now:

- keeps the large PBF/GeoJSON extract as local cache only
- stores compact raw elements for Turrute-relevant features only
- stores route candidates and POIs as before
- avoids duplicating the full `raw` feature inside every raw element

Run:

```bash
npm run osm:import
npm run osm:seed
```

Generated `data/imported/*` files should still not be committed.
