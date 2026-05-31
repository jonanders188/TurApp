import type { Trail } from '@/types/trail';

export type LngLat = [number, number];

export function getTrailCoordinates(trail: Trail): LngLat[] {
  const geometry = trail.route_geojson as any;
  if (geometry?.type === 'LineString' && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.filter(isLngLat) as LngLat[];
  }
  if (geometry?.type === 'MultiLineString' && Array.isArray(geometry.coordinates)) {
    return (geometry.coordinates.flat() as unknown[]).filter(isLngLat) as LngLat[];
  }
  if (typeof trail.lng === 'number' && typeof trail.lat === 'number') {
    return [[trail.lng, trail.lat]];
  }
  return [];
}

function isLngLat(value: unknown): value is LngLat {
  return Array.isArray(value)
    && value.length >= 2
    && typeof value[0] === 'number'
    && typeof value[1] === 'number'
    && Number.isFinite(value[0])
    && Number.isFinite(value[1]);
}

export function getBounds(points: LngLat[]) {
  if (!points.length) return null;
  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);
  return {
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };
}

export function buildSvgProjector(points: LngLat[], width = 1000, height = 620, pad = 48) {
  const bounds = getBounds(points) ?? { minLng: 9.55, maxLng: 10.75, minLat: 58.85, maxLat: 59.75 };
  const lngSpan = Math.max(bounds.maxLng - bounds.minLng, 0.0001);
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.0001);
  const innerWidth = width - pad * 2;
  const innerHeight = height - pad * 2;

  return ([lng, lat]: LngLat) => {
    const x = pad + ((lng - bounds.minLng) / lngSpan) * innerWidth;
    const y = pad + (1 - ((lat - bounds.minLat) / latSpan)) * innerHeight;
    return [x, y] as const;
  };
}

export function coordinatesToSvgPath(points: LngLat[], project: (point: LngLat) => readonly [number, number]) {
  return points
    .map((point, index) => {
      const [x, y] = project(point);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

export function hasRealRoute(trail: Trail) {
  return trail.source === 'kartverket_turrutebasen_wfs' || trail.source === 'kartverket_turrutebasen_live';
}

export function hasRouteGeometry(trail: Trail) {
  return getTrailCoordinates(trail).length > 1;
}
