# V13 – stedssøk og nærmeste turer

Denne patchen gjør søkefeltet på forsiden funksjonelt.

## Hva skjer

- Forsidens søkefelt sender brukeren til `/turer?sted=<søk>`.
- `/turer` geokoder søket til et punkt i/ved Vestfold.
- Turene sorteres etter luftlinjeavstand fra søkestedet til turens startpunkt.
- Kortene viser `x km fra søk` når resultatene er sortert etter sted.
- API-et `/api/trails` støtter også `sted`, `q` og `searchPlace`.

## Geokoding

For å gjøre søket raskt og robust er vanlige Vestfold-steder lagt inn lokalt:

- Tønsberg
- Horten
- Larvik
- Sandefjord
- Stavern
- Færder
- Tjøme
- Nøtterøy
- Holmestrand
- Verdens Ende
- Mølen
- Bøkeskogen

Hvis et sted ikke finnes lokalt, brukes Nominatim/OpenStreetMap som fallback.

## Viktig

Avstanden er foreløpig luftlinje til turens startpunkt, ikke kjøretid eller gangtid. Dette er riktig for første MVP fordi det er raskt og forutsigbart. Senere kan vi koble på routing for faktisk reisetid til startpunkt.
