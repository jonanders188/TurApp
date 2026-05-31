import type { Trail } from '@/types/trail';
import { buildSvgProjector, coordinatesToSvgPath, getTrailCoordinates, hasRealRoute } from '@/lib/geo';
import { getTrailMode } from '@/lib/routeQuality';

type Point = [number, number];

function routeColor(trail: Trail) {
  const mode = getTrailMode(trail);
  if (mode === 'cycling') return '#2563eb';
  if (mode === 'skiing') return '#0ea5e9';
  return '#047857';
}

function midpoint(points: Point[]) {
  if (!points.length) return null;
  return points[Math.floor(points.length / 2)];
}

function endpoint(project: (point: Point) => readonly [number, number], point?: Point) {
  if (!point) return null;
  const [x, y] = project(point);
  return { x, y };
}

export function TrailRoutePreview({ trail, compact = false }: { trail: Trail; compact?: boolean }) {
  const points = getTrailCoordinates(trail);
  const hasRoute = points.length > 1;
  const realRoute = hasRealRoute(trail);
  const project = buildSvgProjector(points.length ? points : [[trail.lng ?? 10.25, trail.lat ?? 59.15]], 1000, 620, compact ? 70 : 82);
  const path = hasRoute ? coordinatesToSvgPath(points, project) : '';
  const color = routeColor(trail);
  const start = endpoint(project, points[0]);
  const end = endpoint(project, points[points.length - 1]);
  const mid = endpoint(project, midpoint(points) ?? undefined);

  return (
    <div className={`relative overflow-hidden rounded-[1.7rem] bg-gradient-to-br from-sky-100 via-emerald-50 to-stone-100 ${compact ? 'h-56' : 'h-[28rem] md:h-[34rem]'}`}>
      <svg viewBox="0 0 1000 620" className="absolute inset-0 h-full w-full" role="img" aria-label={`Kartforhåndsvisning for ${trail.name}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id={`grid-${trail.id}`} width="46" height="46" patternUnits="userSpaceOnUse">
            <path d="M 46 0 L 0 0 0 46" fill="none" stroke="rgba(6,78,59,.075)" strokeWidth="1" />
          </pattern>
          <linearGradient id={`bg-${trail.id}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#dff7ff" />
            <stop offset="48%" stopColor="#ecfdf5" />
            <stop offset="100%" stopColor="#f4ead5" />
          </linearGradient>
          <filter id={`shadow-${trail.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#064e3b" floodOpacity="0.18" />
          </filter>
        </defs>

        <rect width="1000" height="620" fill={`url(#bg-${trail.id})`} />
        <rect width="1000" height="620" fill={`url(#grid-${trail.id})`} />
        <path d="M-80 515 C125 390 215 560 395 462 C585 358 705 424 912 276 C1030 192 1115 220 1140 198 L1140 720 L-80 720 Z" fill="rgba(255,255,255,.55)" />
        <path d="M-80 155 C90 88 200 224 350 145 C505 63 630 122 800 64 C905 28 980 46 1080 20" fill="none" stroke="rgba(14,116,144,.18)" strokeWidth="20" strokeLinecap="round" />
        <path d="M-60 358 C125 280 245 400 415 322 C570 250 682 292 870 205 C960 165 1025 170 1090 125" fill="none" stroke="rgba(6,78,59,.13)" strokeWidth="8" strokeDasharray="18 24" strokeLinecap="round" />
        <path d="M40 220 C155 205 230 240 352 212 C495 180 615 220 748 188 C850 163 928 174 1018 142" fill="none" stroke="rgba(120,113,108,.18)" strokeWidth="5" strokeDasharray="10 18" strokeLinecap="round" />

        {hasRoute ? (
          <g filter={`url(#shadow-${trail.id})`}>
            <path d={path} fill="none" stroke="rgba(255,255,255,.96)" strokeWidth={compact ? 26 : 30} strokeLinecap="round" strokeLinejoin="round" />
            <path d={path} fill="none" stroke={color} strokeWidth={compact ? 15 : 18} strokeLinecap="round" strokeLinejoin="round" />
            <path d={path} fill="none" stroke="#bbf7d0" strokeWidth={compact ? 5 : 6} strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
          </g>
        ) : null}

        {hasRoute && mid ? (
          <g>
            <circle cx={mid.x} cy={mid.y} r={compact ? 18 : 22} fill="white" opacity="0.95" />
            <text x={mid.x} y={mid.y + 5} textAnchor="middle" fontSize={compact ? 18 : 22} fontWeight="900" fill={color}>⌁</text>
          </g>
        ) : null}

        {start ? <Endpoint x={start.x} y={start.y} label="Start" color="#064e3b" /> : null}
        {end && hasRoute ? <Endpoint x={end.x} y={end.y} label="Slutt" color="#0f172a" muted={Boolean(start && Math.abs(start.x - end.x) < 8 && Math.abs(start.y - end.y) < 8)} /> : null}
      </svg>

      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-white/92 px-3 py-1.5 text-xs font-black text-emerald-900 shadow-sm ring-1 ring-emerald-900/10 backdrop-blur">
          {hasRoute ? 'Rute synlig' : 'Kun startpunkt'}
        </span>
        <span className={`rounded-full px-3 py-1.5 text-xs font-black shadow-sm ring-1 backdrop-blur ${realRoute ? 'bg-emerald-950/90 text-white ring-emerald-950/20' : 'bg-white/92 text-slate-800 ring-slate-900/10'}`}>
          {realRoute ? 'Kartverket' : 'Kuratert rute'}
        </span>
      </div>

      <div className="absolute bottom-4 left-4 right-4 rounded-[1.35rem] bg-white/90 p-4 shadow-lg shadow-emerald-950/10 ring-1 ring-emerald-900/10 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{trail.municipality}{trail.area ? ` · ${trail.area}` : ''}</p>
            <p className="mt-1 line-clamp-1 text-base font-black text-slate-950">{trail.name}</p>
          </div>
          <div className="shrink-0 rounded-full bg-emerald-950 px-3 py-1.5 text-xs font-black text-white">{trail.distance_km} km</div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-600">
          <span className="rounded-full bg-emerald-50 px-2 py-1">{trail.estimated_minutes} min</span>
          <span className="rounded-full bg-sky-50 px-2 py-1">{trail.route_type ?? 'Rute'}</span>
          <span className="rounded-full bg-stone-50 px-2 py-1">{trail.difficulty}</span>
        </div>
      </div>
    </div>
  );
}

function Endpoint({ x, y, label, color, muted = false }: { x: number; y: number; label: string; color: string; muted?: boolean }) {
  if (muted) return null;
  return (
    <g>
      <circle cx={x} cy={y} r="21" fill="white" opacity="0.98" />
      <circle cx={x} cy={y} r="11" fill={color} />
      <text x={x} y={y - 28} textAnchor="middle" fontSize="22" fontWeight="900" fill={color} paintOrder="stroke" stroke="white" strokeWidth="7">
        {label}
      </text>
    </g>
  );
}
