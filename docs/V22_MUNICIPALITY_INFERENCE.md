# v22 – kommunevisning for OSM-ruter

OSM/Geofabrik-ruter mangler ofte `addr:municipality`. Tidligere fikk mange derfor bare `Vestfold` som kommune, som gjorde det vanskelig å velge tur.

Denne patchen gjør tre ting:

1. Appen inferrer kommune fra rute/startpunkt dersom `municipality` er generisk (`Vestfold`, tom, `unknown`).
2. OSM Geofabrik-importen setter kommune på nye kandidater basert på tags eller nærmeste kommuneanker.
3. SQL-patch `016_infer_osm_municipalities.sql` oppdaterer eksisterende `trails` og `osm_route_candidates` i Supabase.

Kommuneinferensen er en praktisk MVP-løsning, ikke juridiske kommunegrenser. Den bruker nærmeste ankerpunkt for Vestfold og nærliggende kommuner som Porsgrunn/Skien/Bamble/Siljan.

Kjør SQL-patch i Supabase:

```sql
-- supabase/migrations/202605300016_infer_osm_municipalities.sql
```

Etterpå skal turkort og detaljsider vise kommune sammen med rutenavn, f.eks. `Horten`, `Sandefjord`, `Larvik`, `Tønsberg`, `Færder`, osv.
