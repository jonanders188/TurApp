'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSavedTrailsFromBrowser } from '@/components/SaveTrailButton';

type SavedTrail = ReturnType<typeof getSavedTrailsFromBrowser>[number];

export function SavedTrailsList() {
  const [saved, setSaved] = useState<SavedTrail[]>([]);

  useEffect(() => {
    function refresh() {
      setSaved(getSavedTrailsFromBrowser());
    }
    refresh();
    window.addEventListener('turrute:saved-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('turrute:saved-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  if (!saved.length) {
    return (
      <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-emerald-900/10">
        <h2 className="text-2xl font-black text-slate-950">Ingen lagrede turer ennå</h2>
        <p className="mt-3 text-slate-600">Åpne en tur og trykk “Lagre tur”. Dette lagres lokalt i browseren i v3.</p>
        <Link href="/turer" className="mt-6 inline-flex rounded-full bg-emerald-950 px-6 py-3 font-black text-white">Finn turer</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {saved.map((trail) => (
        <Link key={trail.id} href={`/turer/${trail.slug}`} className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-emerald-900/10 transition hover:-translate-y-1 hover:shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">{trail.municipality}{trail.area ? ` · ${trail.area}` : ''}</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{trail.name}</h2>
          <p className="mt-3 text-sm font-semibold text-slate-500">{trail.distance_km} km · {trail.estimated_minutes} min · {trail.difficulty}</p>
        </Link>
      ))}
    </div>
  );
}
