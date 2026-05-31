import type { ReactNode } from 'react';
import type { Trail } from '@/types/trail';
import {
  getGeometryQualityLabel,
  getRouteShapeLabel,
  getTrailCoordinates,
  hasRealRoute,
} from '@/lib/geo';
import { getTrailMode } from '@/lib/routeQuality';

type LngLat = [number, number];

type Tile = {
  x: number;
  y: number;
  z: number;
  screenX: number;
  screenY: number;
};

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 620;
const TILE_SIZE = 256;

function routeColor(trail: Trail) {
  const mode = getTrailMode(trail);
  if (mode === 'cycling') return '#2563eb';
  if (mode === 'skiing') return '#0284c7';
  return '#00684a';
}

function lonLatToWorld([lng, lat]: LngLat, zoom: number) {
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const scale = TILE_SIZE * 2 ** zoom;

  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function getBounds(points: LngLat[]) {
  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);
  return {
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };
}

function chooseZoom(points: LngLat[], compact: boolean) {
  if (points.length < 2) return compact ? 13 : 14;

  const bounds = getBounds(points);
  const paddingX = compact ? 170 : 140;
  const paddingY = compact ? 130 : 110;
  const maxWidth = VIEWBOX_WIDTH - paddingX;
  const maxHeight = VIEWBOX_HEIGHT - paddingY;

  for (let zoom = 17; zoom >= 9; zoom -= 1) {
    const nw = lonLatToWorld([bounds.minLng, bounds.maxLat], zoom);
    const se = lonLatToWorld([bounds.maxLng, bounds.minLat], zoom);
    if (Math.abs(se.x - nw.x) <= maxWidth && Math.abs(se.y - nw.y) <= maxHeight) return zoom;
  }

  return 9;
}

function tileUrl(x: number, y: number, z: number) {
  const max = 2 ** z;
  const wrappedX = ((x % max) + max) % max;
  return `https://tile.openstreetmap.org/${z}/${wrappedX}/${y}.png`;
}

function buildMapPreview(points: LngLat[], compact: boolean) {
  const fallback: LngLat = [10.3, 59.3];
  const safePoints = points.length ? points : [fallback];
  const zoom = chooseZoom(safePoints, compact);
  const bounds = getBounds(safePoints);
  const center: LngLat = [
    (bounds.minLng + bounds.maxLng) / 2,
    (bounds.minLat + bounds.maxLat) / 2,
  ];
  const centerWorld = lonLatToWorld(center, zoom);

  const tileCenterX = Math.floor(centerWorld.x / TILE_SIZE);
  const tileCenterY = Math.floor(centerWorld.y / TILE_SIZE);
  const tiles: Tile[] = [];

  for (let dx = -3; dx <= 3; dx += 1) {
    for (let dy = -3; dy <= 3; dy += 1) {
      const x = tileCenterX + dx;
      const y = tileCenterY + dy;
      if (y < 0 || y >= 2 ** zoom) continue;
      tiles.push({
        x,
        y,
        z: zoom,
        screenX: VIEWBOX_WIDTH / 2 + x * TILE_SIZE - centerWorld.x,
        screenY: VIEWBOX_HEIGHT / 2 + y * TILE_SIZE - centerWorld.y,
      });
    }
  }

  const projectedPoints = safePoints.map((point) => {
    const world = lonLatToWorld(point, zoom);
    return [
      VIEWBOX_WIDTH / 2 + world.x - centerWorld.x,
      VIEWBOX_HEIGHT / 2 + world.y - centerWorld.y,
    ] as const;
  });

  const routePath = projectedPoints
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');

  return { tiles, routePath, projectedPoints };
}

function PreviewOverlay({ trail, compact, children }: { trail: Trail; compact: boolean; children: ReactNode }) {
  if (compact) {
    return (
      <>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-transparent" />
        <div className="pointer-events-none absolute left-3 top-3 right-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-2">{children}</div>
          <span className="shrink-0 rounded-full bg-emerald-950 px-3 py-1.5 text-xs font-black text-white shadow-lg shadow-emerald-950/20">
            {trail.distance_km} km
          </span>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/12" />
      <div className="pointer-events-none absolute left-4 top-4 right-4 flex flex-wrap gap-2">{children}</div>
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 rounded-[1.35rem] bg-white/94 p-4 shadow-lg shadow-slate-950/15 ring-1 ring-slate-900/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              {trail.municipality}{trail.area ? ` · ${trail.area}` : ''}
            </p>
            <p className="mt-1 line-clamp-1 text-xl font-black tracking-tight text-slate-950">{trail.name}</p>
          </div>
          <div className="shrink-0 rounded-full bg-emerald-950 px-3 py-1.5 text-xs font-black text-white">{trail.distance_km} km</div>
        </div>
      </div>
    </>
  );
}

export function TrailRoutePreview({ trail, compact = false }: { trail: Trail; compact?: boolean }) {
  const points = getTrailCoordinates(trail);
  const hasRoute = points.length > 1;
  const color = routeColor(trail);
  const realRoute = hasRealRoute(trail);
  const qualityLabel = getGeometryQualityLabel(trail);
  const shapeLabel = getRouteShapeLabel(trail);
  const sourceLabel = trail.source === 'osm_geofabrik'
    ? 'OSM-spor'
    : trail.source?.includes('kartverket')
      ? 'Kartverket-spor'
      : realRoute
        ? 'Ekte spor'
        : 'Utvalgt spor';

  const { tiles, routePath, projectedPoints } = buildMapPreview(points, compact);
  const start = projectedPoints[0];
  const end = projectedPoints[projectedPoints.length - 1];

  return (
    <div className={`relative overflow-hidden rounded-[1.8rem] bg-[#dfeee4] ring-1 ring-emerald-950/10 ${compact ? 'h-56 sm:h-60' : 'h-[28rem] md:h-[34rem]'}`}>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`Kartpreview for ${trail.name}`}
      >
        <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#dfeee4" />
        {tiles.map((tile) => (
          <image
            key={`${tile.z}-${tile.x}-${tile.y}`}
            href={tileUrl(tile.x, tile.y, tile.z)}
            x={tile.screenX}
            y={tile.screenY}
            width={TILE_SIZE}
            height={TILE_SIZE}
            preserveAspectRatio="none"
          />
        ))}
        <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="rgba(255,255,255,0.08)" />

        {hasRoute ? (
          <>
            <path d={routePath} fill="none" stroke="#ffffff" strokeWidth={compact ? 18 : 22} strokeLinecap="round" strokeLinejoin="round" opacity="0.96" />
            <path d={routePath} fill="none" stroke={color} strokeWidth={compact ? 10 : 13} strokeLinecap="round" strokeLinejoin="round" />
            <path d={routePath} fill="none" stroke="#bbf7d0" strokeWidth={compact ? 3 : 4} strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
          </>
        ) : null}

        {start ? (
          <circle cx={start[0]} cy={start[1]} r={compact ? 9 : 12} fill="#0f5d47" stroke="#ffffff" strokeWidth="4" />
        ) : null}
        {hasRoute && end ? (
          <circle cx={end[0]} cy={end[1]} r={compact ? 8 : 11} fill={shapeLabel === 'Rundtur' ? '#0f5d47' : '#111827'} stroke="#ffffff" strokeWidth="4" />
        ) : null}
      </svg>

      <PreviewOverlay trail={trail} compact={compact}>
        <Chip>{qualityLabel}</Chip>
        <Chip>{shapeLabel}</Chip>
        <Chip>{sourceLabel}</Chip>
        {!compact && trail.route_point_count ? <Chip>{trail.route_point_count} punkt</Chip> : null}
      </PreviewOverlay>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-slate-800 shadow-sm ring-1 ring-slate-900/10">{children}</span>;
}
