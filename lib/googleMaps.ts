import type { Trail } from '@/types/trail';
import { getTrailMode } from '@/lib/routeQuality';

type LineString = { type: 'LineString'; coordinates: [number, number][] };
type MultiLineString = { type: 'MultiLineString'; coordinates: [number, number][][] };
type RouteGeoJson = LineString | MultiLineString | null | undefined;

function getCoordinates(route: RouteGeoJson): [number, number][] {
  if (!route) return [];
  if (route.type === 'LineString') return route.coordinates || [];
  if (route.type === 'MultiLineString') return route.coordinates?.flat() || [];
  return [];
}

function latLon(coord: [number, number]) {
  const [lon, lat] = coord;
  return `${lat},${lon}`;
}

function haversineKm([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function routeIsProbablyLoop(coords: [number, number][]) {
  if (coords.length < 2) return false;
  return haversineKm(coords[0], coords[coords.length - 1]) < 0.5;
}

function googleMapsStartUrl(route: RouteGeoJson, fallbackLat?: number | null, fallbackLon?: number | null) {
  const coords = getCoordinates(route).filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
  const point = coords[0] ?? (fallbackLat && fallbackLon ? [fallbackLon, fallbackLat] as [number, number] : null);
  if (!point) return 'https://www.google.com/maps';
  const params = new URLSearchParams({ api: '1', query: latLon(point) });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export function shouldUseGoogleDirections(trail: Trail) {
  const coords = getCoordinates(trail.route_geojson as RouteGeoJson).filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
  if (coords.length < 2) return false;
  if (routeIsProbablyLoop(coords)) return false;

  const mode = getTrailMode(trail);
  if (mode !== 'walking' && mode !== 'cycling') return false;

  const straightLineKm = haversineKm(coords[0], coords[coords.length - 1]);
  if (straightLineKm < 0.6) return false;

  // Google Maps får kun start/slutt. Ikke send waypoints: det lager ofte rare spagetti-ruter.
  return true;
}

export function googleMapsUrlForTrail(trail: Trail) {
  const coords = getCoordinates(trail.route_geojson as RouteGeoJson).filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));

  if (shouldUseGoogleDirections(trail) && coords.length >= 2) {
    const params = new URLSearchParams({
      api: '1',
      origin: latLon(coords[0]),
      destination: latLon(coords[coords.length - 1]),
      travelmode: 'walking',
    });
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  return googleMapsStartUrl(trail.route_geojson as RouteGeoJson, trail.lat, trail.lng);
}

export function googleMapsLabelForTrail(trail: Trail) {
  return shouldUseGoogleDirections(trail) ? 'Åpne i Google Maps' : 'Veibeskrivelse til startpunkt';
}

export function hasGoogleMapsRoute(route: RouteGeoJson) {
  return getCoordinates(route).length >= 2;
}
