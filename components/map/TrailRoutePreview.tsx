import type { ReactNode } from 'react';
import type { Trail } from '@/types/trail';
import {
  buildSvgProjector,
  coordinatesToSvgPath,
  getGeometryQualityLabel,
  getRouteShapeLabel,
  getTrailCoordinates,
  hasRealRoute,
} from '@/lib/geo';
import { getTrailMode } from '@/lib/routeQuality';

type Point = [number, number];

function routeColor(trail: Trail) {
  const mode = getTrailMode(trail);
  if (mode === 'cycling') return '#2563eb';
  if (mode === 'skiing') return '#0284c7';
  return '#0f5d47';
}

function endpoint(project: (point: Point) => readonly [number, number], point?: Point) {
  if (!point) return null;
  const [x, y] = project(point);
  return { x, y };
}

function midpoint(points: Point[]) {
  if (!points.length) return null;
  return points[Math.floor(points.length / 2)];
}

export function TrailRoutePreview({ trail, compact = false }: { trail: Trail; compact?: boolean }) {
  const points = getTrailCoordinates(trail);
  const hasRoute = points.length > 1;
  const realRoute = hasRealRoute(trail);
  const project = buildSvgProjector(points.length ? points : [[trail.lng ?? 10.25, trail.lat ?? 59.15]], 1000, 620, compact ? 78 : 86);
  const path = hasRoute ? coordinatesToSvgPath(points, project) : '';
  const color = routeColor(trail);
  const start = endpoint(project, points[0]);
  const end = endpoint(project, points[points.length - 1]);
  const middle = endpoint(project, midpoint(points) ?? undefined);
  const qualityLabel = getGeometryQualityLabel(trail);
  const shapeLabel = getRouteShapeLabel(trail);

  return (
    <div className={`relative overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-[#e8f4ec] via-[#f7fbf7] to-[#e7f0fb] ${compact ? 'h-60' : 'h-[28rem] md:h-[34rem]'}`}>
      <svg viewBox="0 0 1000 620" className="absolute inset-0 h-full w-full" role="img" aria-label={`Rutevisning for ${trail.name}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id={`terrain-${trail.id}`} width="46" height="46" patternUnits="userSpaceOnUse">
            <path d="M 0 23 C 9 5, 21 5, 30 23 S 51 41, 60 23" fill="none" stroke="rgba(15,93,71,.06)" strokeWidth="1" />
          </pattern>
          <filter id={`shadow-${trail.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#0f5d47" floodOpacity="0.18" />
          </filter>
        </defs>

        <rect width="1000" height="620" fill="#f6fbf7" />
        <rect width="1000" height="620" fill={`url(#terrain-${trail.id})`} opacity="0.7" />
        <path d="M-60 530 C 160 415 270 555 500 455 C 705 365 845 410 1060 260 L 1060 700 L -60 700 Z" fill="rgba(186,230,253,.32)" />
        <path d="M-80 175 C 160 112 250 220 425 165 C 640 98 770 135 1070 58" fill="none" stroke="rgba(15,93,71,.08)" strokeWidth="8" strokeLinecap="round" />
        <path d="M-50 360 C 140 292 242 390 420 325 C 620 248 758 295 1060 172" fill="none" stroke="rgba(14,165,233,.08)" strokeWidth="6" strokeDasharray="16 22" strokeLinecap="round" />

        {hasRoute ? (
          <g filter={`url(#shadow-${trail.id})`}>
            <path d={path} fill="none" stroke="rgba(255,255,255,.98)" strokeWidth={compact ? 34 : 38} strokeLinecap="round" strokeLinejoin="round" />
            <path d={path} fill="none" stroke={color} strokeWidth={compact ? 18 : 22} strokeLinecap="round" strokeLinejoin="round" />
            <path d={path} fill="none" stroke="rgba(255,255,255,.48)" strokeWidth={compact ? 6 : 8} strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
          </g>
        ) : null}

        {middle && hasRoute ? (
          <g>
            <circle cx={middle.x} cy={middle.y} r={compact ? 18 : 22} fill="white" opacity="0.96" />
            <text x={middle.x} y={middle.y + 5} textAnchor="middle" fontSize={compact ? 16 : 20} fontWeight="900" fill={color}>⌁</text>
          </g>
        ) : null}

        {start ? <Marker x={start.x} y={start.y} label="Start" color="#0f5d47" compact={compact} /> : null}
        {end && hasRoute ? <Marker x={end.x} y={end.y} label={shapeLabel === 'Rundtur' ? 'Tilbake' : 'Mål'} color="#111827" compact={compact} muted={Boolean(start && Math.abs(start.x - end.x) < 8 && Math.abs(start.y - end.y) < 8)} /> : null}
      </svg>

      <div className="absolute left-4 top-4 right-4 flex flex-wrap gap-2">
        <Chip>{qualityLabel}</Chip>
        <Chip>{shapeLabel}</Chip>
        <Chip>{realRoute ? 'Kartverket-spor' : 'Kuratert spor'}</Chip>
      </div>

      <div className="absolute bottom-4 left-4 right-4 rounded-[1.5rem] bg-white/92 p-4 shadow-lg shadow-emerald-950/10 ring-1 ring-emerald-900/10 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">{trail.municipality}{trail.area ? ` · ${trail.area}` : ''}</p>
            <p className="mt-1 line-clamp-1 text-lg font-black tracking-tight text-slate-950">{trail.name}</p>
          </div>
          <div className="shrink-0 rounded-full bg-emerald-950 px-3 py-1.5 text-xs font-black text-white">{trail.distance_km} km</div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-600">
          <span className="rounded-full bg-emerald-50 px-2 py-2">{trail.estimated_minutes} min</span>
          <span className="rounded-full bg-slate-50 px-2 py-2">{trail.difficulty}</span>
          <span className="rounded-full bg-sky-50 px-2 py-2">{shapeLabel}</span>
        </div>
      </div>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white/92 px-3 py-1.5 text-xs font-black text-slate-800 shadow-sm ring-1 ring-slate-900/10 backdrop-blur">{children}</span>;
}

function Marker({ x, y, label, color, compact, muted = false }: { x: number; y: number; label: string; color: string; compact: boolean; muted?: boolean }) {
  if (muted) return null;
  return (
    <g>
      <circle cx={x} cy={y} r={compact ? 18 : 22} fill="white" opacity="0.98" />
      <circle cx={x} cy={y} r={compact ? 9 : 11} fill={color} />
      <text x={x} y={y - (compact ? 24 : 28)} textAnchor="middle" fontSize={compact ? 18 : 22} fontWeight="900" fill={color} paintOrder="stroke" stroke="white" strokeWidth="7">
        {label}
      </text>
    </g>
  );
}
