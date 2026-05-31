import Link from 'next/link';
import { TrailCard } from '@/components/TrailCard';
import { AppBottomNav } from '@/components/ui/AppBottomNav';
import { FilterChip } from '@/components/ui/FilterChip';
import { SearchBar } from '@/components/ui/SearchBar';
import { WeatherCard } from '@/components/ui/WeatherCard';
import { TrailRoutePreview } from '@/components/map/TrailRoutePreview';
import { getMunicipalities, getTrails } from '@/lib/trails';
import { getGeometryQuality } from '@/lib/geo';
import type { TrailFilters } from '@/types/trail';

export const dynamic = 'force-dynamic';

const filterLabels: Record<NonNullable<TrailFilters['suitable']> | 'all', { label: string; icon: string }> = {
  all: { label: 'Alle', icon: '⌁' },
  stroller: { label: 'Barnevogn', icon: '◴' },
  carrier: { label: 'Bæremeis', icon: '🎒' },
  wheelchair: { label: 'Rullestol', icon: '♿' },
  easy: { label: 'Lett å gå', icon: '↗' },
  children: { label: 'Barn', icon: '👧' },
  dog: { label: 'Hund', icon: '🐾' },
};

export default async function TrailsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const suitable = typeof params.suitable === 'string' ? params.suitable as TrailFilters['suitable'] : undefined;
  const municipality = typeof params.municipality === 'string' ? params.municipality : undefined;
  const maxDistanceKm = typeof params.maxDistanceKm === 'string' ? Number(params.maxDistanceKm) : undefined;
  const searchPlace = typeof params.sted === 'string' ? params.sted : (typeof params.q === 'string' ? params.q : undefined);

  const { trails, source, error, place } = await getTrails({ suitable, municipality, maxDistanceKm, searchPlace });
  const { trails: allTrails } = await getTrails();
  const municipalities = getMunicipalities(allTrails);
  const featuredTrail = trails[0] ?? null;
  const detailedCount = trails.filter((trail) => ['good', 'detailed'].includes(getGeometryQuality(trail))).length;

  return (
    <main className="min-h-screen bg-[#f4f7f2] pb-24 text-slate-950 md:pb-0">
      <section className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-10">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-black text-emerald-950">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-900 text-white">⌁</span>
            <span className="text-xl">Turrute</span>
          </Link>
          <div className="rounded-full bg-white px-4 py-2 text-sm font-bold text-emerald-900 shadow-sm ring-1 ring-emerald-900/10">{trails.length} turer</div>
        </nav>

        <header className="mt-5 overflow-hidden rounded-[2.2rem] bg-white shadow-sm ring-1 ring-emerald-900/10">
          <div className="grid gap-5 p-5 md:p-8 lg:grid-cols-[1fr_0.85fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">Vestfold · mobil først</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-emerald-950 md:text-6xl">Finn en tur du faktisk får lyst til å gå.</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Vi viser utvalgte turer først, med tydelig rute, praktiske behov og værvindu. Når dataene er for grove, sier vi ifra i stedet for å late som kartet er mer detaljert enn det er.
              </p>
              <div className="mt-5"><SearchBar defaultValue={searchPlace ?? ''} /></div>
              <div className="mt-5 flex flex-wrap gap-2">
                {Object.entries(filterLabels).slice(1).map(([key, item]) => (
                  <FilterChip key={key} href={`/turer?suitable=${key}`} label={item.label} icon={item.icon} active={suitable === key} />
                ))}
              </div>
            </div>
            <WeatherCard compact />
          </div>
        </header>

        {featuredTrail ? (
          <section className="mt-6 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-emerald-900/10 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">{place ? `Nærmest ${place.label}` : 'Anbefalt akkurat nå'}</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{place ? 'Turene sortert etter avstand fra søket ditt' : 'Se formen på turen før du bestemmer deg'}</h2>
              </div>
              <Link href={`/turer/${featuredTrail.slug}`} className="rounded-full bg-emerald-950 px-4 py-2 text-sm font-black text-white hover:bg-emerald-900">Åpne</Link>
            </div>
            <TrailRoutePreview trail={featuredTrail} compact={false} />
          </section>
        ) : null}

        <section className="mt-6 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-emerald-900/10 md:p-5">
          <div className="flex flex-wrap gap-2">
            {Object.entries(filterLabels).map(([key, item]) => {
              const href = key === 'all' ? '/turer' : `/turer?suitable=${key}`;
              const active = key === (suitable ?? 'all');
              return <FilterChip key={key} href={href} label={item.label} icon={item.icon} active={active} />;
            })}
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto border-t border-slate-100 pt-4 pb-1">
            <Link href="/turer" className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${!municipality ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700'}`}>
              Alle steder
            </Link>
            {municipalities.map((name) => (
              <Link key={name} href={`/turer?municipality=${encodeURIComponent(name)}`} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${municipality === name ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                {name}
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat value={String(trails.length)} label="matcher filteret" />
          <Stat value={String(detailedCount)} label="har god/detaljert rute" />
          <Stat value={source} label="datakilde" error={error ?? undefined} />
        </div>


        {searchPlace ? (
          <section className={`mt-6 rounded-[1.7rem] p-4 text-sm leading-6 ring-1 ${place ? 'bg-emerald-50 text-emerald-950 ring-emerald-200' : 'bg-amber-50 text-amber-950 ring-amber-200'}`}>
            {place ? (
              <>
                <strong className="font-black">Søkested funnet:</strong> Viser turene nærmest {place.label}. Avstandene på kortene er luftlinje til turens startpunkt.
              </>
            ) : (
              <>
                <strong className="font-black">Fant ikke søkestedet:</strong> Prøv et sted i Vestfold, for eksempel Tønsberg, Horten, Larvik, Sandefjord eller Verdens Ende.
              </>
            )}
          </section>
        ) : null}

        <section className="mt-6 rounded-[1.7rem] bg-amber-50 p-4 text-sm leading-6 text-amber-950 ring-1 ring-amber-200">
          <strong className="font-black">Ærlig status på rutedata:</strong> En del av de utvalgte turene har fortsatt få rutepunkter. De fungerer fint for å velge tur og se hovedformen på turen, men ikke alle er detaljerte nok for presis stinavigasjon. Da anbefaler vi å åpne ruten i kartmodus eller bruke GPX når bedre spor er tilgjengelig.
        </section>

        {trails.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {trails.map((trail, index) => <TrailCard key={trail.id} trail={trail} featured={index === 0} />)}
          </div>
        ) : (
          <div className="mt-8 rounded-[1.75rem] bg-white p-8 text-slate-600 shadow-sm">Ingen turer matcher filteret ennå.</div>
        )}
      </section>
      <AppBottomNav active="trails" />
    </main>
  );
}

function Stat({ value, label, error }: { value: string; label: string; error?: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-emerald-900/10">
      <p className="text-2xl font-black text-emerald-950">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{label}</p>
      {error ? <p className="mt-2 text-xs text-amber-700">Fallback: {error}</p> : null}
    </div>
  );
}
