import type { Trail } from '@/types/trail';

export type MunicipalityHit = {
  name: string;
  distanceKm: number;
};

type MunicipalityCenter = {
  name: string;
  lat: number;
  lng: number;
};

// Kommunesentre/ankerpunkter for Vestfold + nærliggende områder som kan komme med i bboxen.
// Dette er ikke juridiske kommunegrenser, men en robust fallback når OSM-rader mangler kommune-tag.
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

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function trailAnchor(trail: Trail): { lat: number; lng: number } | null {
  if (typeof trail.lat === 'number' && typeof trail.lng === 'number') return { lat: trail.lat, lng: trail.lng };

  const coords = trail.route_geojson?.coordinates || [];
  if (!coords.length) return null;

  // Bruk senter av bbox, ikke første punkt, for å unngå at startpunkt alene drar ruten til feil kommune.
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const coord of coords) {
    const [lng, lat] = coord;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

  if (![minLng, maxLng, minLat, maxLat].every(Number.isFinite)) return null;
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

export function inferMunicipalityFromLatLng(lat?: number | null, lng?: number | null): MunicipalityHit | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const point = { lat, lng };
  const nearest = municipalityCenters
    .map((municipality) => ({ name: municipality.name, distanceKm: haversineKm(point, municipality) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];

  // Innenfor import-bboxen bør nærmeste kommune alltid være langt nærmere enn dette.
  if (!nearest || nearest.distanceKm > 85) return null;
  return nearest;
}

export function inferMunicipalityFromTrail(trail: Trail): MunicipalityHit | null {
  const anchor = trailAnchor(trail);
  return anchor ? inferMunicipalityFromLatLng(anchor.lat, anchor.lng) : null;
}

export function withInferredMunicipality(trail: Trail): Trail {
  if (!isGenericMunicipality(trail.municipality)) return trail;

  const hit = inferMunicipalityFromTrail(trail);
  if (!hit) return trail;

  return {
    ...trail,
    municipality: hit.name,
  };
}

export function trailLocationLabel(trail: Trail) {
  const withMunicipality = withInferredMunicipality(trail);
  return `${withMunicipality.municipality}${withMunicipality.area ? ` · ${withMunicipality.area}` : ''}`;
}
