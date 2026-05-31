import type { Trail } from '@/types/trail';
import { getTrailCoordinates, hasRealRoute } from '@/lib/geo';

type Point = [number, number];

function pointsToSvgPath(points: Point[]) {
  if (!points.length) return '';
  const lngs = points.map((p) => Number(p[0]));
  const lats = points.map((p) => Number(p[1]));
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const pad = 18;
  const width = 320 - pad * 2;
  const height = 170 - pad * 2;
  const lngSpan = Math.max(maxLng - minLng, 0.0001);
  const latSpan = Math.max(maxLat - minLat, 0.0001);
  const scaled = points.map(([lng, lat]) => {
    const x = pad + ((Number(lng) - minLng) / lngSpan) * width;
    const y = pad + (1 - ((Number(lat) - minLat) / latSpan)) * height;
    return [x, y] as const;
  });
  return scaled.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}

export function TrailRoutePreview({ trail, compact = false }: { trail: Trail; compact?: boolean }) {
  const points = getTrailCoordinates(trail);
  const path = pointsToSvgPath(points);
  const hasRoute = points.length > 1;
  const realRoute = hasRealRoute(trail);

  return (
    <div className={`relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-emerald-100 via-sky-100 to-stone-100 ${compact ? 'h-36' : 'h-64 md:h-80'}`}>
      <svg viewBox="0 0 320 170" className="absolute inset-0 h-full w-full" role="img" aria-label={`Kartforhåndsvisning for ${trail.name}`} preserveAspectRatio="none">
        <defs>
          <pattern id={`grid-${trail.id}`} width="26" height="26" patternUnits="userSpaceOnUse">
            <path d="M 26 0 L 0 0 0 26" fill="none" stroke="rgba(6,78,59,.08)" strokeWidth="1" />
          </pattern>
          <linearGradient id={`water-${trail.id}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#d9f99d" />
          </linearGradient>
        </defs>
        <rect width="320" height="170" fill={`url(#water-${trail.id})`} />
        <rect width="320" height="170" fill={`url(#grid-${trail.id})`} />
        <path d="M-20 125 C60 98 95 148 162 114 C220 86 260 96 342 68 L342 200 L-20 200 Z" fill="rgba(255,255,255,.45)" />
        <path d="M-10 46 C55 25 102 54 155 36 C219 15 258 42 335 20" fill="none" stroke="rgba(6,78,59,.13)" strokeWidth="3" strokeDasharray="6 8" />
        <path d="M-6 86 C76 62 116 103 176 82 C237 61 270 72 334 48" fill="none" stroke="rgba(6,78,59,.10)" strokeWidth="2" strokeDasharray="3 7" />
        {hasRoute ? (
          <>
            <path d={path} fill="none" stroke="rgba(255,255,255,.95)" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
            <path d={path} fill="none" stroke="#065f46" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <path d={path} fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <RouteEndpoint path={path} kind="start" />
            <RouteEndpoint path={path} kind="end" />
          </>
        ) : null}
      </svg>

      <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-emerald-900 shadow-sm ring-1 ring-emerald-900/10 backdrop-blur">
        {hasRoute ? (realRoute ? 'Ekte rute' : 'Demo-rute') : 'Startpunkt'}
      </div>
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-[1.2rem] bg-white/88 p-3 shadow-sm ring-1 ring-emerald-900/10 backdrop-blur">
        <div>
          <p className="text-xs font-bold text-emerald-700">{trail.municipality}{trail.area ? ` · ${trail.area}` : ''}</p>
          <p className="text-sm font-black text-slate-950">{hasRoute ? `${trail.route_type ?? 'Rute'} · ${realRoute ? 'Kartverket' : 'egen geometri'}` : 'Mangler rutegeometri'}</p>
        </div>
        <div className="rounded-full bg-emerald-950 px-3 py-1 text-xs font-bold text-white">{trail.distance_km} km</div>
      </div>
    </div>
  );
}

function RouteEndpoint({ path, kind }: { path: string; kind: 'start' | 'end' }) {
  const regex = kind === 'start' ? /M\s+([0-9.]+)\s+([0-9.]+)/ : /L\s+([0-9.]+)\s+([0-9.]+)(?![\s\S]*L\s+[0-9.]+\s+[0-9.]+)/;
  const match = path.match(regex);
  if (!match) return null;
  const x = Number(match[1]);
  const y = Number(match[2]);
  return (
    <g>
      <circle cx={x} cy={y} r="10" fill="white" opacity="0.96" />
      <circle cx={x} cy={y} r="5" fill={kind === 'start' ? '#065f46' : '#0f172a'} />
    </g>
  );
}
