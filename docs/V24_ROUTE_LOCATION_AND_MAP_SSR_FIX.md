# v24 – Route location labels and Leaflet SSR fix

This patch fixes two problems found after publishing Geofabrik trails.

## 1. Leaflet SSR crash

`TrailLeafletMap` imports Leaflet and React Leaflet, which require `window`. The App Router pages were importing it directly from server components, so `/turer/[slug]` and `/turer/[slug]/kart` could crash during SSR/prerender.

The pages now import `TrailLeafletMapDynamic`, a small client-only dynamic wrapper with `ssr: false`.

## 2. Wrong municipality across the fjord

The previous municipality inference used coarse Vestfold boxes. That could label east-side Oslofjord routes, like routes near Vestby/Moss, as Horten or Holmestrand.

The runtime location helper now:

- samples points along the whole route geometry,
- includes east-side zones for Vestby, Moss and Våler,
- re-infers municipality for `osm_geofabrik` rows so stale DB values do not win,
- still keeps area/type labels such as `Kyststi`, `Løype`, `Natursti`, `Turvei` and `Sti`.

The SQL migration also corrects obvious existing east-side rows in Supabase.
