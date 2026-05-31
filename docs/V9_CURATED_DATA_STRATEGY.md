# Turrute v9: kuratert datastrategi

## Hvorfor endringen ble gjort

Rådata fra Kartverket/Turrutebasen er ekte og nyttig, men mye av det er rutesegmenter fra A til B, ikke ferdige turforslag for vanlige brukere. Appen skal derfor ikke vise råimporterte linjer direkte som turer.

Fra v9 er modellen:

- `raw_turruter`: rå Turrutebasen-data, lagret som datagrunnlag/adminmateriale.
- `trails`: kuraterte, publiserte app-turer som faktisk gir mening for brukeren.

## Datakilder

### 1. Kuraterte Vestfold-turer

Dette er hovedinnholdet i MVP-en. Turene ligger i `data/curated-vestfold-trails.json` og seedes til Supabase via migrasjonen:

```text
supabase/migrations/202605300009_curated_vestfold_app_trails.sql
```

Disse turene har menneskelige navn, beskrivelser, tags og enkle rundtur-/tur-retur-geometrier for demo. Rutegeometrien må kvalitetssikres før offentlig lansering.

### 2. Kartverket / Geonorge Turrutebasen

Brukes som rå rutedata. Importen kan kjøres fra `/admin/import`, men lagrer i v9 bare til `raw_turruter` og publiserer ikke automatisk til `trails`.

### 3. OpenStreetMap / Overpass

Brukes for praktiske punkter nær startområdet:

- parkering
- toalett
- benker
- lekeplasser
- kafé
- rasteplass
- utsiktspunkt

API-route:

```text
/api/amenities?lat=...&lng=...&radius=900
```

Denne vises på turdetaljsiden via `NearbyAmenitiesCard`.

### 4. MET API

Brukes videre for værkort.

### 5. UT.no / DNT

Ikke brukt direkte i koden nå. Kan vurderes senere som partner-/lisensavklaring, siden åpen maskinlesbar tilgang ikke bør forutsettes.

## Neste steg

1. Kjør `009_curated_vestfold_app_trails.sql` i Supabase.
2. Deploy til Vercel.
3. Sjekk `/turer`, `/kart` og en turdetaljside.
4. Bruk `/admin/import` kun for å fylle `raw_turruter`.
5. Lag admin-flyt for å koble råruter til kuraterte turer senere.
