# V20 – real map previews

Trail previews use real OpenStreetMap tiles and the full route geometry instead of the older schematic SVG-style preview.

Changes:

- Compact trail cards keep the map visible and remove the large blurred title panel that covered the route.
- The route is fitted with normal padding so the line is centered in the preview.
- Large featured previews keep a small info overlay, but still leave the map visible.
- Geofabrik/OSM routes are labelled `OSM-spor`.
- Route line styling uses a white casing and green inner stroke for visibility on map tiles.

This patch is based on a fresh repo zip from the current app state.
