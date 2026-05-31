import Link from 'next/link';
import { TrailCard } from '@/components/TrailCard';
import { AppBottomNav } from '@/components/ui/AppBottomNav';
import { FilterChip } from '@/components/ui/FilterChip';
import { SearchBar } from '@/components/ui/SearchBar';
import { WeatherCard } from '@/components/ui/WeatherCard';
import { getMunicipalities, getTrails } from '@/lib/trails';
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

  const { trails, source, error } = await getTrails({ suitable, municipality, maxDistanceKm });
  const { trails: allTrails } = await getTrails();
  const municipalities = getMunicipalities(allTrails);
  const withRouteCount = trails.filter((trail) => trail.route_geojson?.coordinates?.length && trail.route_geojson.coordinates.length > 1).length;

  return (
    <main className="min-h-screen bg-[#f4f7f2] pb-24 text-slate-950 md:pb-0">
      <section className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-10">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-black text-emerald-950">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-900 text-white">⌁</span>
            <span>Turrute</span>
          </Link>
          <div className="rounded-full bg-white px-4 py-2 text-sm font-bold text-emerald-900 shadow-sm ring-1 ring-emerald-900/10">{trails.length} turer</div>
        </nav>

        <header className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.8fr] lg:items-stretch">
          <div className="rounded-[2.2rem] bg-white p-6 shadow-sm ring-1 ring-emerald-900/10 md:p-8">
            <Link href="/" className="text-sm font-black text-emerald-700">← Til forsiden</Link>
            <p className="mt-7 text-xs font-black uppercase tracking-[0.25em] text-emerald-700">Vestfold</p>
            <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">Turer nær deg</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              Filtrer på behov som barnevogn, bæremeis, rullestol, barn, hund og lette nærturer. Nå med ekte rutegeometri fra Kartverket/Turrutebasen. Demo-turene er skjult fra produktvisningen.
            </p>
            <div className="mt-6"><SearchBar /></div>
          </div>
          <WeatherCard compact />
        </header>

        <section className="mt-6 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-emerald-900/10 md:p-5">
          <div className="flex flex-wrap gap-2">
            {Object.entries(filterLabels).map(([key, item]) => {
              const href = key === 'all' ? '/turer' : `/turer?suitable=${key}`;
              const active = key === (suitable ?? 'all');
              return <FilterChip key={key} href={href} label={item.label} icon={item.icon} active={active} />;
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {municipalities.map((name) => (
              <Link key={name} href={`/turer?municipality=${encodeURIComponent(name)}`} className={`rounded-full px-4 py-2 text-sm font-bold ${municipality === name ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                {name}
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Stat value={String(trails.length)} label="matcher filteret" />
          <Stat value={String(withRouteCount)} label="har rutegeometri" />
          <Stat value={source} label="datakilde" error={error ?? undefined} />
        </div>

        {trails.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {trails.map((trail) => <TrailCard key={trail.id} trail={trail} />)}
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
