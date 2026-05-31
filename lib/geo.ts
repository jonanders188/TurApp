import type { Trail } from '@/types/trail';

export type LngLat = [number, number];
export type GeometryQuality = 'minimal' | 'coarse' | 'good' | 'detailed';

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
  return trail.source === 'kartverket_turrutebasen_wfs'
    || trail.source === 'kartverket_turrutebasen_live'
    || trail.source === 'osm_overpass'
    || trail.source === 'osm_geofabrik';
}

export function hasRouteGeometry(trail: Trail) {
  return getTrailCoordinates(trail).length > 1;
}

export function getRoutePointCount(trail: Trail) {
  return trail.route_point_count ?? getTrailCoordinates(trail).length;
}

export function haversineKm([lng1, lat1]: LngLat, [lng2, lat2]: LngLat) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isLoopTrail(trail: Trail) {
  const points = getTrailCoordinates(trail);
  if (points.length < 2) return false;
  return haversineKm(points[0], points[points.length - 1]) < 0.35;
}

export function getGeometryQuality(trail: Trail): GeometryQuality {
  if (trail.route_quality === 'detailed') return 'detailed';
  if (trail.route_quality === 'usable') return 'good';
  if (trail.route_quality === 'candidate' || trail.route_quality === 'rough') return 'coarse';
  const count = getRoutePointCount(trail);
  if (count >= 40) return 'detailed';
  if (count >= 12) return 'good';
  if (count >= 5) return 'coarse';
  return 'minimal';
}

export function getGeometryQualityLabel(trail: Trail) {
  const quality = getGeometryQuality(trail);
  if (quality === 'detailed') return 'Detaljert spor';
  if (quality === 'good') return 'God rutedetalj';
  if (quality === 'coarse') return 'Skjematisk rute';
  return 'Kun grov rute';
}

export function getGeometryQualityMessage(trail: Trail) {
  const quality = getGeometryQuality(trail);
  if (quality === 'detailed') return 'Denne turen har nok punkter til å gi en detaljert rutevisning mens du går.';
  if (quality === 'good') return 'Denne turen har brukbar geometri for å velge tur og følge hovedløpet på kart.';
  if (quality === 'coarse') return 'Ruten er fin for å forstå formen på turen, men sporet er for grovt til presis stinavigasjon.';
  return 'Vi har foreløpig bare et grovt ruteutkast. For pen og trygg turvisning bør denne erstattes med tettere GPX/linjegeometri.';
}

export function getRouteShapeLabel(trail: Trail) {
  return isLoopTrail(trail) ? 'Rundtur' : 'Fra A til B';
}
