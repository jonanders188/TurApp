'use client';

import { useState } from 'react';

type Result = {
  ok?: boolean;
  dryRun?: boolean;
  rawFeatureCount?: number;
  trailCount?: number;
  candidateTrailCount?: number;
  saved?: { rawRows: number; trails: number };
  note?: string;
  errors?: Array<{ layer: string; error: string }>;
  error?: string;
};

export function ImportRunner() {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [maxFeaturesPerLayer, setMaxFeaturesPerLayer] = useState(500);
  const [maxTrails, setMaxTrails] = useState(120);
  const [result, setResult] = useState<Result | null>(null);

  async function runImport() {
    setBusy(true);
    setResult(null);

    try {
      const response = await fetch('/api/import/turrutebasen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-turrute-import-token': token } : {}),
        },
        body: JSON.stringify({ dryRun, maxFeaturesPerLayer, maxTrails }),
      });

      const json = await response.json().catch(() => ({}));
      setResult({ ...json, ok: response.ok && json.ok !== false });
    } catch (error) {
      setResult({ ok: false, error: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  }

  const rawCount = result?.dryRun ? result.rawFeatureCount : result?.saved?.rawRows;
  const trailCount = result?.dryRun ? (result.candidateTrailCount ?? result.trailCount) : result?.saved?.trails;

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-emerald-900/10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Live-import</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">Oppdater ruter fra UI</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Denne knappen henter rå Kartverket-ruter til Supabase. I v9 publiseres de ikke direkte som turer; appen viser kuraterte Vestfold-turer som kan kobles mot rådata senere.
          </p>
        </div>
        <label className="flex items-center gap-3 rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-900 ring-1 ring-emerald-900/10">
          <input type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} />
          Dry run
        </label>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">Admin-token</span>
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="TURRUTE_IMPORT_ADMIN_TOKEN"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-700 focus:bg-white"
          />
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">Maks per lag</span>
          <input
            type="number"
            value={maxFeaturesPerLayer}
            min={50}
            max={2000}
            onChange={(event) => setMaxFeaturesPerLayer(Number(event.target.value))}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-700 focus:bg-white"
          />
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">Maks app-turer</span>
          <input
            type="number"
            value={maxTrails}
            min={10}
            max={500}
            onChange={(event) => setMaxTrails(Number(event.target.value))}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-700 focus:bg-white"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runImport}
          disabled={busy}
          className="rounded-full bg-emerald-950 px-6 py-3 font-black text-white shadow-lg shadow-emerald-950/15 hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'Importer...' : dryRun ? 'Test import' : 'Importer til Supabase'}
        </button>
        <p className="text-sm font-semibold text-slate-500">Start med dry run. Slå av dry run når tallene ser riktige ut.</p>
      </div>

      {result ? (
        <div className={`mt-5 rounded-[1.5rem] p-4 ${result.ok ? 'bg-emerald-50 text-emerald-950' : 'bg-red-50 text-red-950'}`}>
          <p className="font-black">{result.ok ? 'Import fullført' : 'Import feilet'}</p>
          {typeof rawCount === 'number' || typeof trailCount === 'number' ? (
            <p className="mt-1 text-sm font-semibold">{rawCount ?? 0} råruter · {trailCount ?? 0} kandidater · {result?.saved ? `${result.saved.trails} publisert` : '0 publisert'}</p>
          ) : null}
          {result.note ? <p className="mt-2 text-sm font-semibold">{result.note}</p> : null}
          {result.error ? <p className="mt-2 text-sm font-semibold">{result.error}</p> : null}
          {result.errors?.length ? <p className="mt-2 text-xs leading-6">Advarsler: {result.errors.slice(0, 3).map((e) => `${e.layer}: ${e.error.slice(0, 120)}`).join(' | ')}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
