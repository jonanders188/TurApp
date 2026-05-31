import type { Trail } from '@/types/trail';
import { getTrailCoordinates, haversineKm, type LngLat } from '@/lib/geo';

export type GeocodedPlace = {
  query: string;
  label: string;
  lat: number;
  lng: number;
  source: 'local' | 'nominatim';
};

const knownPlaces: Record<string, Omit<GeocodedPlace, 'query' | 'source'> & { source?: GeocodedPlace['source'] }> = {
  tonsberg: { label: 'Tønsberg', lat: 59.2675, lng: 10.4076 },
  tønsberg: { label: 'Tønsberg', lat: 59.2675, lng: 10.4076 },
  horten: { label: 'Horten', lat: 59.4172, lng: 10.4834 },
  larvik: { label: 'Larvik', lat: 59.0533, lng: 10.0352 },
  sandefjord: { label: 'Sandefjord', lat: 59.1312, lng: 10.2166 },
  stavern: { label: 'Stavern', lat: 59.0007, lng: 10.0332 },
  færder: { label: 'Færder', lat: 59.1902, lng: 10.4264 },
  faerder: { label: 'Færder', lat: 59.1902, lng: 10.4264 },
  nøtterøy: { label: 'Nøtterøy', lat: 59.2273, lng: 10.4088 },
  notteroy: { label: 'Nøtterøy', lat: 59.2273, lng: 10.4088 },
  tjøme: { label: 'Tjøme', lat: 59.1108, lng: 10.3932 },
  tjome: { label: 'Tjøme', lat: 59.1108, lng: 10.3932 },
  re: { label: 'Revetal', lat: 59.3726, lng: 10.2624 },
  revetal: { label: 'Revetal', lat: 59.3726, lng: 10.2624 },
  sande: { label: 'Sande i Vestfold', lat: 59.5862, lng: 10.2075 },
  holmestrand: { label: 'Holmestrand', lat: 59.4876, lng: 10.3176 },
  andebu: { label: 'Andebu', lat: 59.3058, lng: 10.1766 },
  stokke: { label: 'Stokke', lat: 59.2236, lng: 10.3002 },
  åsgårdstrand: { label: 'Åsgårdstrand', lat: 59.3496, lng: 10.4698 },
  asgardstrand: { label: 'Åsgårdstrand', lat: 59.3496, lng: 10.4698 },
  verdensure: { label: 'Verdens Ende', lat: 59.0529, lng: 10.4106 },
  'verdens ende': { label: 'Verdens Ende', lat: 59.0529, lng: 10.4106 },
  mølen: { label: 'Mølen', lat: 58.9695, lng: 9.8349 },
  molen: { label: 'Mølen', lat: 58.9695, lng: 9.8349 },
  bøkeskogen: { label: 'Bøkeskogen', lat: 59.0556, lng: 10.0351 },
  bokeskogen: { label: 'Bøkeskogen', lat: 59.0556, lng: 10.0351 },
};

function normalizeQuery(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function localGeocode(query: string): GeocodedPlace | null {
  const normalized = normalizeQuery(query);
  const hit = knownPlaces[normalized];
  if (!hit) return null;
  return { query, label: hit.label, lat: hit.lat, lng: hit.lng, source: 'local' };
}

export async function geocodePlace(query?: string | null): Promise<GeocodedPlace | null> {
  const clean = String(query || '').trim();
  if (!clean) return null;

  const local = localGeocode(clean);
  if (local) return local;

  const params = new URLSearchParams({
    q: `${clean}, Vestfold, Norway`,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'no',
    addressdetails: '1',
  });

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        'User-Agent': process.env.TURRUTE_OSM_USER_AGENT || process.env.TURRUTE_IMPORT_USER_AGENT || 'Turrute MVP jon@bluestonepim.com',
        Accept: 'application/json',
      },
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!res.ok) return null;
    const data = await res.json() as Array<{ display_name?: string; lat?: string; lon?: string }>;
    const first = data[0];
    const lat = Number(first?.lat);
    const lng = Number(first?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return {
      query: clean,
      label: first.display_name?.split(',').slice(0, 2).join(', ') || clean,
      lat,
      lng,
      source: 'nominatim',
    };
  } catch {
    return null;
  }
}

export function getTrailAnchorPoint(trail: Trail): LngLat | null {
  if (typeof trail.lng === 'number' && typeof trail.lat === 'number') return [trail.lng, trail.lat];
  const coordinates = getTrailCoordinates(trail);
  return coordinates[0] ?? null;
}

export function distanceFromPlaceKm(trail: Trail, place: Pick<GeocodedPlace, 'lat' | 'lng'>) {
  const anchor = getTrailAnchorPoint(trail);
  if (!anchor) return Number.POSITIVE_INFINITY;
  return haversineKm([place.lng, place.lat], anchor);
}

export function sortTrailsByDistanceFromPlace(trails: Trail[], place: GeocodedPlace) {
  return trails
    .map((trail) => ({ ...trail, distance_to_search_km: Math.round(distanceFromPlaceKm(trail, place) * 10) / 10 }))
    .sort((a, b) => Number(a.distance_to_search_km ?? Infinity) - Number(b.distance_to_search_km ?? Infinity));
}
