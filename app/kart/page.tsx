import Link from 'next/link';
import { AppBottomNav } from '@/components/ui/AppBottomNav';
import { RouteOverviewMap } from '@/components/map/RouteOverviewMap';
import { TrailCard } from '@/components/TrailCard';
import { getTrails } from '@/lib/trails';
import { hasRealRoute, hasRouteGeometry } from '@/lib/geo';

export const dynamic = 'force-dynamic';

export default async function MapPage() {
  const { trails, source, error } = await getTrails();
  const withRoutes = trails.filter(hasRouteGeometry);
  const realRoutes = trails.filter((trail) => hasRouteGeometry(trail) && hasRealRoute(trail));

  return (
    <main className="min-h-screen bg-[#f4f7f2] pb-24 text-slate-950 md:pb-0">
      <section className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-10">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-black text-emerald-950">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-900 text-white shadow-lg shadow-emerald-900/15">⌁</span>
            <span className="text-xl">Turrute</span>
          </Link>
          <div className="hidden items-center gap-7 text-sm font-bold text-slate-600 md:flex">
            <Link href="/turer" className="hover:text-emerald-800">Turer</Link>
            <Link href="/admin/import" className="hover:text-emerald-800">Dataimport</Link>
          </div>
        </nav>

        <header className="mt-8 rounded-[2.4rem] bg-emerald-950 p-6 text-white shadow-2xl shadow-emerald-950/15 md:p-9">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-200">Kart</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">Levende turkart</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-emerald-50">
            Her vises ruter som faktisk ligger i appdatabasen. Når Turrutebasen-importen kjøres, dukker ekte Kartverket-ruter opp her og på tursidene.
          </p>
        </header>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Stat value={String(trails.length)} label="turer i appen" />
          <Stat value={String(withRoutes.length)} label="med rutegeometri" />
          <Stat value={String(realRoutes.length)} label="ekte importerte ruter" />
          <Stat value={source} label="aktiv datakilde" error={error ?? undefined} />
        </div>

        <section className="mt-8">
          <RouteOverviewMap trails={withRoutes.length ? withRoutes : trails} />
        </section>

        {realRoutes.length === 0 ? (
          <section className="mt-8 rounded-[2rem] bg-amber-50 p-6 text-amber-950 ring-1 ring-amber-200">
            <h2 className="text-2xl font-black">Ingen importerte app-ruter ennå</h2>
            <p className="mt-2 leading-7">
              Appen viser ingen godkjente app-ruter ennå. Kjør Turrutebasen-importen, så får du levende rutedata fra Supabase.
            </p>
            <Link href="/admin/import" className="mt-5 inline-flex rounded-full bg-amber-900 px-5 py-3 text-sm font-black text-white hover:bg-amber-800">
              Gå til importstatus
            </Link>
          </section>
        ) : (
          <section className="mt-10">
            <h2 className="text-3xl font-black tracking-tight">Ekte importerte ruter</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {realRoutes.slice(0, 12).map((trail) => <TrailCard key={trail.id} trail={trail} />)}
            </div>
          </section>
        )}
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
