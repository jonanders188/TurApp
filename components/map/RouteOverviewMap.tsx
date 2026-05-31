import Link from 'next/link';
import type { Trail } from '@/types/trail';
import { buildSvgProjector, coordinatesToSvgPath, getTrailCoordinates, hasRealRoute, hasRouteGeometry } from '@/lib/geo';

export function RouteOverviewMap({ trails, selectedId }: { trails: Trail[]; selectedId?: string }) {
  const drawable = trails.filter(hasRouteGeometry);
  const allPoints = drawable.flatMap(getTrailCoordinates);
  const project = buildSvgProjector(allPoints);

  return (
    <div className="overflow-hidden rounded-[2.4rem] bg-white shadow-xl shadow-emerald-950/10 ring-1 ring-emerald-900/10">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-900/10 p-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Levende kart</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Ekte ruter fra databasen</h2>
        </div>
        <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-900 ring-1 ring-emerald-900/10">
          {drawable.length} ruter med geometri
        </div>
      </div>

      <div className="relative bg-gradient-to-br from-sky-100 via-emerald-50 to-stone-100">
        <svg viewBox="0 0 1000 620" className="h-[24rem] w-full md:h-[34rem]" role="img" aria-label="Kart over importerte turruter i Vestfold" preserveAspectRatio="xMidYMid meet">
          <defs>
            <pattern id="overview-grid" width="42" height="42" patternUnits="userSpaceOnUse">
              <path d="M 42 0 L 0 0 0 42" fill="none" stroke="rgba(6,78,59,.08)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="1000" height="620" fill="rgba(236,253,245,.86)" />
          <rect width="1000" height="620" fill="url(#overview-grid)" />
          <path d="M-40 495 C128 420 220 548 370 468 C520 388 650 430 812 316 C910 248 996 260 1080 205 L1080 700 L-40 700 Z" fill="rgba(255,255,255,.42)" />
          <path d="M-30 185 C175 120 255 230 430 165 C602 100 730 130 1010 48" fill="none" stroke="rgba(14,116,144,.14)" strokeWidth="8" strokeLinecap="round" />
          <path d="M-20 360 C160 292 274 398 420 330 C604 246 712 290 1032 176" fill="none" stroke="rgba(6,78,59,.12)" strokeWidth="4" strokeDasharray="10 16" strokeLinecap="round" />

          {drawable.map((trail) => {
            const points = getTrailCoordinates(trail);
            const path = coordinatesToSvgPath(points, project);
            const selected = trail.id === selectedId;
            const real = hasRealRoute(trail);
            const start = points[0] ? project(points[0]) : null;
            return (
              <g key={trail.id}>
                <path d={path} fill="none" stroke="rgba(255,255,255,.92)" strokeWidth={selected ? 15 : 10} strokeLinecap="round" strokeLinejoin="round" />
                <path d={path} fill="none" stroke={real ? '#065f46' : '#64748b'} strokeWidth={selected ? 8 : 5} strokeLinecap="round" strokeLinejoin="round" opacity={selected ? 1 : 0.82} />
                {start ? <circle cx={start[0]} cy={start[1]} r={selected ? 9 : 6} fill="white" stroke={real ? '#065f46' : '#64748b'} strokeWidth="3" /> : null}
              </g>
            );
          })}
        </svg>

        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-4 py-2 text-xs font-black text-emerald-900 shadow-sm ring-1 ring-emerald-900/10 backdrop-blur">
          {drawable.some(hasRealRoute) ? 'Kartverket-ruter importert' : 'Ingen ekte ruter importert ennå'}
        </div>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {drawable.slice(0, 9).map((trail) => (
          <Link key={trail.id} href={`/turer/${trail.slug}`} className="rounded-[1.4rem] bg-slate-50 p-4 ring-1 ring-slate-900/5 transition hover:bg-emerald-50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{trail.municipality}</p>
                <h3 className="mt-1 line-clamp-1 font-black text-slate-950">{trail.name}</h3>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${hasRealRoute(trail) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                {hasRealRoute(trail) ? 'Ekte' : 'Demo'}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-500">{trail.distance_km} km · {trail.estimated_minutes} min · {trail.difficulty}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
