import type { Trail } from '@/types/trail';

export type MunicipalityHit = {
  name: string;
  distanceKm: number;
  confidence?: number;
  method?: 'route-samples' | 'zone' | 'nearest-center';
};

type Point = { lat: number; lng: number };
type Zone = {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  weight?: number;
};

type MunicipalityCenter = {
  name: string;
  lat: number;
  lng: number;
};

// Grove kommune-/stedssoner for import-bboxen.
// Dette er ikke juridiske grenser, men de brukes som et trygt visningslag.
// Viktig: OSM-importen dekker også østsiden av Oslofjorden. Derfor må vi
// ha randsoner for Vestby/Moss, ellers kan ruter over fjorden bli merket
// feil som Horten/Holmestrand.
const municipalityZones: Zone[] = [
  // Øyer/kyst sør for Tønsberg bør ikke trekkes mot Tønsberg sentrum.
  { name: 'Færder', minLat: 58.86, maxLat: 59.25, minLng: 10.28, maxLng: 10.68, weight: 1.35 },
  { name: 'Larvik', minLat: 58.82, maxLat: 59.18, minLng: 9.65, maxLng: 10.32, weight: 1.15 },
  { name: 'Sandefjord', minLat: 59.02, maxLat: 59.30, minLng: 10.00, maxLng: 10.42, weight: 1.1 },
  { name: 'Tønsberg', minLat: 59.18, maxLat: 59.39, minLng: 10.16, maxLng: 10.58, weight: 1.05 },
  { name: 'Horten', minLat: 59.32, maxLat: 59.54, minLng: 10.28, maxLng: 10.72, weight: 1.15 },
  { name: 'Holmestrand', minLat: 59.35, maxLat: 59.74, minLng: 9.88, maxLng: 10.45, weight: 1.05 },

  // Østsiden av Oslofjorden. Disse må komme før nearest-center fallback,
  // ellers kan ruter i Vestby/Moss få feil Vestfold-kommune.
  { name: 'Vestby', minLat: 59.46, maxLat: 59.75, minLng: 10.55, maxLng: 10.95, weight: 1.45 },
  { name: 'Moss', minLat: 59.28, maxLat: 59.55, minLng: 10.55, maxLng: 10.88, weight: 1.35 },
  { name: 'Våler', minLat: 59.34, maxLat: 59.58, minLng: 10.75, maxLng: 11.08, weight: 1.05 },

  // Randsoner som kan komme med fra bbox/import.
  { name: 'Porsgrunn', minLat: 59.02, maxLat: 59.23, minLng: 9.50, maxLng: 9.88, weight: 1 },
  { name: 'Skien', minLat: 59.14, maxLat: 59.36, minLng: 9.45, maxLng: 9.85, weight: 1 },
  { name: 'Bamble', minLat: 58.82, maxLat: 59.12, minLng: 9.45, maxLng: 9.95, weight: 1 },
  { name: 'Siljan', minLat: 59.20, maxLat: 59.42, minLng: 9.55, maxLng: 9.88, weight: 1 },
  { name: 'Kongsberg', minLat: 59.54, maxLat: 59.78, minLng: 9.35, maxLng: 9.86, weight: 1 },
  { name: 'Drammen', minLat: 59.62, maxLat: 59.86, minLng: 9.98, maxLng: 10.45, weight: 1 },
];

const municipalityCenters: MunicipalityCenter[] = [
  { name: 'Horten', lat: 59.4172, lng: 10.4834 },
  { name: 'Holmestrand', lat: 59.4876, lng: 10.3176 },
  { name: 'Tønsberg', lat: 59.2675, lng: 10.4076 },
  { name: 'Færder', lat: 59.1902, lng: 10.4264 },
  { name: 'Sandefjord', lat: 59.1312, lng: 10.2166 },
  { name: 'Larvik', lat: 59.0533, lng: 10.0352 },
  { name: 'Porsgrunn', lat: 59.1405, lng: 9.6561 },
  { name: 'Skien', lat: 59.2096, lng: 9.6090 },
  { name: 'Bamble', lat: 59.0018, lng: 9.7457 },
  { name: 'Siljan', lat: 59.2826, lng: 9.7109 },
  { name: 'Kongsberg', lat: 59.6686, lng: 9.6502 },
  { name: 'Drammen', lat: 59.7439, lng: 10.2045 },
  { name: 'Vestby', lat: 59.6024, lng: 10.7467 },
  { name: 'Moss', lat: 59.4340, lng: 10.6577 },
  { name: 'Våler', lat: 59.4889, lng: 10.8657 },
];

const genericMunicipalityNames = new Set([
  '',
  'vestfold',
  'vestfold og telemark',
  'telemark',
  'norway',
  'norge',
  'ukjent',
  'unknown',
]);

function normalize(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

export function isGenericMunicipality(value?: string | null) {
  return genericMunicipalityNames.has(normalize(value));
}

function haversineKm(a: Point, b: Point) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function pointInZone(point: Point, zone: Zone) {
  return point.lat >= zone.minLat && point.lat <= zone.maxLat && point.lng >= zone.minLng && point.lng <= zone.maxLng;
}

function routePoints(trail: Trail): Point[] {
  const coords = trail.route_geojson?.coordinates || [];
  const points = coords
    .map(([lng, lat]) => ({ lat, lng }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));

  if (points.length) return points;
  if (typeof trail.lat === 'number' && typeof trail.lng === 'number') return [{ lat: trail.lat, lng: trail.lng }];
  return [];
}

function sampleRoutePoints(points: Point[], maxSamples = 13) {
  if (points.length <= maxSamples) return points;

  const samples: Point[] = [];
  for (let i = 0; i < maxSamples; i += 1) {
    const index = Math.round((i / (maxSamples - 1)) * (points.length - 1));
    samples.push(points[index]);
  }
  return samples;
}

function bboxCenter(points: Point[]): Point | null {
  if (!points.length) return null;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const point of points) {
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
  }

  if (![minLng, maxLng, minLat, maxLat].every(Number.isFinite)) return null;
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

function inferMunicipalityFromRoutePoints(points: Point[]): MunicipalityHit | null {
  const samples = sampleRoutePoints(points);
  const center = bboxCenter(points);
  if (center) samples.push(center);

  const scores = new Map<string, number>();
  for (const point of samples) {
    for (const zone of municipalityZones) {
      if (!pointInZone(point, zone)) continue;
      scores.set(zone.name, (scores.get(zone.name) || 0) + (zone.weight || 1));
    }
  }

  const winner = Array.from(scores.entries()).sort((a, b) => b[1] - a[1])[0];
  if (!winner) return null;

  const total = Array.from(scores.values()).reduce((sum, value) => sum + value, 0) || 1;
  const anchor = center || samples[0];
  const municipalityCenter = municipalityCenters.find((municipality) => municipality.name === winner[0]);
  return {
    name: winner[0],
    distanceKm: municipalityCenter && anchor ? haversineKm(anchor, municipalityCenter) : 0,
    confidence: Math.min(0.98, Math.max(0.45, winner[1] / total)),
    method: 'route-samples',
  };
}

export function inferMunicipalityFromLatLng(lat?: number | null, lng?: number | null): MunicipalityHit | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const point = { lat, lng };

  const zone = municipalityZones.find((candidate) => pointInZone(point, candidate));
  if (zone) {
    const center = municipalityCenters.find((municipality) => municipality.name === zone.name);
    return {
      name: zone.name,
      distanceKm: center ? haversineKm(point, center) : 0,
      confidence: 0.65,
      method: 'zone',
    };
  }

  const nearest = municipalityCenters
    .map((municipality) => ({ name: municipality.name, distanceKm: haversineKm(point, municipality), confidence: 0.35, method: 'nearest-center' as const }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];

  if (!nearest || nearest.distanceKm > 85) return null;
  return nearest;
}

export function inferMunicipalityFromTrail(trail: Trail): MunicipalityHit | null {
  const points = routePoints(trail);
  const byRoute = inferMunicipalityFromRoutePoints(points);
  if (byRoute) return byRoute;

  const center = bboxCenter(points);
  if (center) return inferMunicipalityFromLatLng(center.lat, center.lng);

  return inferMunicipalityFromLatLng(trail.lat, trail.lng);
}

function inferAreaFromText(trail: Trail) {
  const haystack = `${trail.name || ''} ${trail.route_type || ''} ${trail.surface_type || ''} ${(trail.tags || []).join(' ')}`.toLowerCase();

  if (/kyststi|kyst|fjord|strand|svaberg|promenade/.test(haystack)) return 'Kyststi';
  if (/lysløype|lysløypa|løype|løypa|rundløype|skiløype/.test(haystack)) return 'Løype';
  if (/natursti|eventyrsti|eventyrstien/.test(haystack)) return 'Natursti';
  if (/runden|runde|rundtur/.test(haystack)) return 'Rundtur';
  if (/kollen|åsen|åsen|knatten|fjell|heia|utsikt/.test(haystack)) return 'Ås og utsikt';
  if (/skogen|skog|marka/.test(haystack)) return 'Skogstur';
  if (/gravel|fine_gravel|compacted|grus|track/.test(haystack)) return 'Turvei';
  if (/path|sti|stien|trailblazed/.test(haystack)) return 'Sti';
  return null;
}

export function withInferredMunicipality(trail: Trail): Trail {
  const hit = inferMunicipalityFromTrail(trail);
  const inferredArea = trail.area || inferAreaFromText(trail);

  const shouldUseInferredMunicipality = Boolean(
    hit
    && (
      isGenericMunicipality(trail.municipality)
      // Existing OSM rows may have been backfilled with an older, too-coarse
      // municipality guess. For Geofabrik routes, route geometry is a better
      // source than stale DB text when the hit comes from samples/zones.
      || (trail.source === 'osm_geofabrik' && hit.method !== 'nearest-center' && (hit.confidence ?? 0) >= 0.5)
    ),
  );

  if (!shouldUseInferredMunicipality && !inferredArea) return trail;

  return {
    ...trail,
    municipality: shouldUseInferredMunicipality ? hit?.name || trail.municipality : trail.municipality,
    area: inferredArea,
  };
}

export function trailLocationLabel(trail: Trail) {
  const withMunicipality = withInferredMunicipality(trail);
  return `${withMunicipality.municipality}${withMunicipality.area ? ` · ${withMunicipality.area}` : ''}`;
}
