# V21 cleanup: static real-map previews

This cleanup removes Leaflet from the trail-card preview component. The card preview now renders OpenStreetMap raster tiles inside an SVG and projects the route geometry on top of them.

Why:
- avoids `window is not defined` during Next.js build/prerender
- avoids React Leaflet prop/type issues in card previews
- keeps the preview visually map-based instead of schematic
- leaves the full interactive map pages to the existing Leaflet map component

Also adds small shell helper scripts in `bin/` and `turapp-aliases.sh` for repeatable cleanup, zip, build and safe push workflows.
