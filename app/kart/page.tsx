import Link from 'next/link';
import { AppBottomNav } from '@/components/ui/AppBottomNav';
import { RouteOverviewMap } from '@/components/map/RouteOverviewMap';
import { TrailCard } from '@/components/TrailCard';
import { getTrails } from '@/lib/trails';
import { getGeometryQuality, hasRouteGeometry } from '@/lib/geo';

export const dynamic = 'force-dynamic';

export default async function MapPage() {
  const { trails, source, error } = await getTrails();
  const withRoutes = trails.filter(hasRouteGeometry);
  const displayRoutes = withRoutes.length ? withRoutes : trails;
  const detailedCount = displayRoutes.filter((trail) => ['good', 'detailed'].includes(getGeometryQuality(trail))).length;

  return (
    <main className="min-h-screen bg-[#f4f7f2] pb-24 text-slate-950 md:pb-0">
      <section className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-10">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-black text-emerald-950">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-900 text-white shadow-lg shadow-emerald-900/15">⌁</span>
            <span className="text-xl">Turrute</span>
          </Link>
          <Link href="/turer" className="rounded-full bg-white px-4 py-2 text-sm font-black text-emerald-950 shadow-sm ring-1 ring-emerald-900/10">Alle turer</Link>
        </nav>

        <header className="mt-5 rounded-[2.2rem] bg-white p-5 shadow-sm ring-1 ring-emerald-900/10 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">Kartoversikt</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">Velg tur ut fra selve ruten</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">Denne siden er laget for å bla i turer visuelt på mobil: se formen på ruten først, og åpne turen når den ser fristende ut. Vi viser tydelig hvilke ruter som bare er skjematiske.</p>
        </header>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat value={String(displayRoutes.length)} label="turer med rute" />
          <Stat value={String(detailedCount)} label="god/detaljert geometri" />
          <Stat value={source} label="datakilde" error={error ?? undefined} />
        </div>

        <section className="mt-6">
          <RouteOverviewMap trails={displayRoutes} />
        </section>

        <section className="mt-6 rounded-[1.7rem] bg-amber-50 p-4 text-sm leading-6 text-amber-950 ring-1 ring-amber-200">
          <strong className="font-black">Viktig:</strong> Flere av de utvalgte turene har fortsatt grov geometri. De ser fine ut i oversikt, men skal dere imponere skikkelig på mobil når brukeren faktisk går turen, bør de byttes ut med tettere GPX- eller OSM-baserte spor.
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-black tracking-tight text-slate-950">Turer på kartet</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {displayRoutes.map((trail, index) => <TrailCard key={trail.id} trail={trail} featured={index === 0} />)}
          </div>
        </section>
      </section>
      <AppBottomNav active="map" />
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
