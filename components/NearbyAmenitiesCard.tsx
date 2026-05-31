'use client';

import { useEffect, useState } from 'react';

type AmenitiesResponse = {
  counts?: Record<string, number>;
  amenities?: Array<{ id: string; label: string; name: string | null }>;
  error?: string;
};

export function NearbyAmenitiesCard({ lat, lng }: { lat: number | null; lng: number | null }) {
  const [data, setData] = useState<AmenitiesResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lat || !lng) return;
    let ignore = false;
    setLoading(true);
    fetch(`/api/amenities?lat=${lat}&lng=${lng}&radius=900`)
      .then((res) => res.json())
      .then((json) => { if (!ignore) setData(json); })
      .catch((error) => { if (!ignore) setData({ error: error instanceof Error ? error.message : String(error) }); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [lat, lng]);

  const counts = data?.counts ?? {};
  const items = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <section className="rounded-[1.8rem] bg-white p-5 ring-1 ring-slate-900/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">I nærheten</h2>
          <p className="mt-1 text-sm text-slate-500">OpenStreetMap/Overpass: praktiske punkter rundt startområdet.</p>
        </div>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-800">OSM</span>
      </div>

      {loading ? <p className="mt-4 text-sm font-semibold text-slate-500">Henter punkter i nærheten...</p> : null}
      {data?.error ? <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Kunne ikke hente OSM-punkter akkurat nå.</p> : null}

      {items.length ? (
        <div className="mt-5 grid grid-cols-2 gap-2">
          {items.map(([label, count]) => (
            <div key={label} className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-lg font-black text-slate-950">{count}</p>
              <p className="text-xs font-bold text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      ) : !loading ? (
        <p className="mt-4 text-sm leading-6 text-slate-500">Ingen praktiske punkter funnet innen 900 meter. Dette kan skyldes manglende OSM-data.</p>
      ) : null}
    </section>
  );
}
