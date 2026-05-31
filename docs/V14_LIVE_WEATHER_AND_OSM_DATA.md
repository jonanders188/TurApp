# V14 – live vær og OSM-data

## Live vær

Forsiden bruker nå `WeatherCard` som klientkomponent:

1. Hvis browseren deler posisjon, brukes brukerens GPS-posisjon.
2. Hvis `/turer?sted=...` har geokodet søkested, brukes søkestedets koordinater.
3. Hvis posisjon ikke deles, faller appen tilbake til Tønsberg/Vestfold.
4. Turdetaljsider bruker fortsatt turens startpunkt via `LiveWeatherCard`.

Været hentes fra `/api/weather`, som igjen bruker MET/Yr Locationforecast. OSM brukes ikke til vær.

## Hva OSM kan gi

OSM/Overpass kan gi mye mer enn rutegeometri:

- ruter og stier: `route=hiking`, `route=foot`, `highway=path`, `highway=footway`, `highway=track`
- praktiske punkter: `amenity=parking`, `amenity=toilets`, `amenity=bench`, `amenity=cafe`, `amenity=drinking_water`
- opplevelse: `tourism=viewpoint`, `tourism=picnic_site`, `leisure=playground`
- kvalitet/tilgjengelighet der tagget: `surface`, `smoothness`, `wheelchair`, `stroller`, `incline`, `lit`, `dog`

OSM-data er dugnadsbasert, så appen må fortsatt score og filtrere. Ikke alt fra OSM bør publiseres direkte.

## Endrede filer

- `components/ui/WeatherCard.tsx`
- `app/turer/page.tsx`
- `app/api/weather/route.ts`
