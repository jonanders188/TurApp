import Link from 'next/link';
import { AppBottomNav } from '@/components/ui/AppBottomNav';
import { ImportRunner } from '@/components/admin/ImportRunner';
import { createAdminClient } from '@/lib/supabase-admin';
import { hasSupabaseAdminConfig } from '@/lib/env';

export const dynamic = 'force-dynamic';

type ImportStatus = {
  ok: boolean;
  source?: string;
  note?: string;
  counts?: { raw_turruter: number; imported_trails: number; curated_trails: number; osm_raw_elements?: number; osm_candidates?: number; osm_pois?: number; osm_trails?: number };
  latestRun?: any;
  errors?: string[];
};

async function getStatus(): Promise<ImportStatus> {
  if (!hasSupabaseAdminConfig()) {
    return {
      ok: false,
      source: 'local',
      note: 'Mangler Supabase service/secret key. Appen kan vise lokal JSON, men ikke sjekke levende import.',
      counts: { raw_turruter: 0, imported_trails: 0, curated_trails: 0, osm_raw_elements: 0, osm_candidates: 0, osm_pois: 0, osm_trails: 0 },
    };
  }

  try {
    const supabase = createAdminClient();
    const raw = await supabase.from('raw_turruter').select('*', { count: 'exact', head: true });
    const imported = await supabase.from('trails').select('*', { count: 'exact', head: true }).eq('source', 'kartverket_turrutebasen_wfs');
    const curated = await supabase.from('trails').select('*', { count: 'exact', head: true }).eq('curated', true);
    const latest = await supabase.from('import_runs').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
    const osmRaw = await supabase.from('osm_raw_elements').select('*', { count: 'exact', head: true });
    const osmCandidates = await supabase.from('osm_route_candidates').select('*', { count: 'exact', head: true });
    const osmPois = await supabase.from('osm_pois').select('*', { count: 'exact', head: true });
    const osmTrails = await supabase.from('trails').select('*', { count: 'exact', head: true }).eq('source', 'osm_overpass');

    return {
      ok: true,
      source: 'supabase',
      counts: {
        raw_turruter: raw.count ?? 0,
        imported_trails: imported.count ?? 0,
        curated_trails: curated.count ?? 0,
        osm_raw_elements: osmRaw.count ?? 0,
        osm_candidates: osmCandidates.count ?? 0,
        osm_pois: osmPois.count ?? 0,
        osm_trails: osmTrails.count ?? 0,
      },
      latestRun: latest.data ?? null,
      errors: [raw.error?.message, imported.error?.message, curated.error?.message, latest.error?.message, osmRaw.error?.message, osmCandidates.error?.message, osmPois.error?.message, osmTrails.error?.message].filter(Boolean) as string[],
    };
  } catch (error) {
    return { ok: false, note: error instanceof Error ? error.message : String(error), counts: { raw_turruter: 0, imported_trails: 0, curated_trails: 0, osm_raw_elements: 0, osm_candidates: 0, osm_pois: 0, osm_trails: 0 } };
  }
}


export default async function ImportAdminPage() {
  const status = await getStatus();
  const counts = status.counts ?? { raw_turruter: 0, imported_trails: 0, curated_trails: 0, osm_raw_elements: 0, osm_candidates: 0, osm_pois: 0, osm_trails: 0 };

  return (
    <main className="min-h-screen bg-[#f4f7f2] pb-24 text-slate-950 md:pb-0">
      <section className="mx-auto max-w-6xl px-5 py-6 md:px-8 md:py-10">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-black text-emerald-950">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-900 text-white shadow-lg shadow-emerald-900/15">⌁</span>
            <span className="text-xl">Turrute</span>
          </Link>
          <Link href="/kart" className="rounded-full bg-white px-4 py-2 text-sm font-black text-emerald-900 shadow-sm ring-1 ring-emerald-900/10">Se kartet</Link>
        </nav>

        <header className="mt-8 rounded-[2.4rem] bg-white p-6 shadow-xl shadow-emerald-950/10 ring-1 ring-emerald-900/10 md:p-9">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-700">Data</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">Dataimport</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            Dette er datagrunnlaget bak Turrute. OSM lagres nå bredt som råelementer, rutekandidater og praktiske punkter, men appen viser bare ruter som passer produktet og har god nok kvalitet.
          </p>
        </header>

        <div className="mt-6 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Stat value={String(counts.raw_turruter)} label="råruter importert" />
          <Stat value={String(counts.imported_trails)} label="ekte app-turer" />
          <Stat value={String(counts.curated_trails)} label="kuraterte turer" />
          <Stat value={String(counts.osm_raw_elements ?? 0)} label="OSM råelementer" />
          <Stat value={String(counts.osm_candidates ?? 0)} label="OSM kandidater" />
          <Stat value={String(counts.osm_pois ?? 0)} label="OSM punkter" />
        </div>


        <div className="mt-8">
          <ImportRunner />
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl">
            <h2 className="text-3xl font-black tracking-tight">Terminal som backup</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">Dette er fortsatt nyttig for utvikling og feilsøking. UI-knappen over bruker samme serverlogikk som appen.</p>
            <pre className="mt-5 overflow-x-auto rounded-[1.2rem] bg-black/40 p-4 text-sm text-emerald-100"><code>{`npm run osm:import
npm run osm:seed
# evt: npm run osm:seed:replace-demo`}</code></pre>
            <p className="mt-4 text-xs leading-6 text-slate-400">Krever TURRUTE_SUPABASE_SERVICE_ROLE_KEY=sb_secret_... i .env.local.</p>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-emerald-900/10">
            <h2 className="text-3xl font-black tracking-tight">Kjør via API</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">For en liten live-import kan du poste til API-et. Bruk token så importen ikke er åpen for alle.</p>
            <pre className="mt-5 overflow-x-auto rounded-[1.2rem] bg-slate-950 p-4 text-xs text-emerald-100"><code>{`curl -X POST http://localhost:3000/api/import/turrutebasen \\
  -H 'Content-Type: application/json' \\
  -H 'x-turrute-import-token: DIN_TOKEN' \\
  -d '{"maxFeaturesPerLayer":80,"maxTrails":60}'`}</code></pre>
            <p className="mt-4 text-xs leading-6 text-slate-500">Sett TURRUTE_IMPORT_ADMIN_TOKEN i .env.local først. I dev kan API-et også kjøres uten token hvis token ikke er satt.</p>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-emerald-900/10">
          <h2 className="text-2xl font-black">Siste importstatus</h2>
          {status.note ? <p className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">{status.note}</p> : null}
          {status.latestRun ? (
            <dl className="mt-5 grid gap-3 md:grid-cols-2">
              <Info label="Status" value={status.latestRun.status ?? '-'} />
              <Info label="Tidspunkt" value={status.latestRun.created_at ?? '-'} />
              <Info label="Ruter" value={String(status.latestRun.trail_count ?? '-')} />
              <Info label="Bbox" value={status.latestRun.bbox ?? '-'} />
            </dl>
          ) : (
            <p className="mt-3 text-slate-600">Ingen importkjøring registrert ennå.</p>
          )}
          {status.errors?.length ? <p className="mt-4 text-sm text-amber-700">Statusfeil: {status.errors.join(', ')}</p> : null}
        </section>
      </section>
      <AppBottomNav active="map" />
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-emerald-900/10"><p className="text-3xl font-black text-emerald-950">{value}</p><p className="mt-1 text-sm font-semibold text-slate-500">{label}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</dt><dd className="mt-1 break-words font-black text-slate-950">{value}</dd></div>;
}
