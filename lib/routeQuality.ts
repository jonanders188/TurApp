export type TrailMode = 'walking' | 'cycling' | 'skiing' | 'unknown';

type RouteGeoJson = { type?: string; coordinates?: unknown[] | unknown[][] } | null | undefined;

type TrailLike = {
  name?: string | null;
  category?: string | null;
  source_category?: string | null;
  route_type?: string | null;
  trail_mode?: string | null;
  distance_km?: number | null;
  distanceKm?: number | null;
  municipality?: string | null;
  route_geojson?: RouteGeoJson;
  source?: string | null;
  curated?: boolean | null;
  published?: boolean | null;
  is_demo?: boolean | null;
};

function asText(value?: unknown) {
  return String(value ?? '').trim();
}

function normalizeCategory(category?: string | null) {
  return asText(category).replace(/^app:/i, '').trim();
}

function numberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hasLineCoordinates(route: RouteGeoJson) {
  const coords = route?.coordinates;
  return Array.isArray(coords) && coords.length > 1;
}

export function isBadImportedName(name?: string | null) {
  const value = asText(name);

  if (!value) return true;
  if (/^https?:\/\//i.test(value)) return true;
  if (/^app:/i.test(value)) return true;
  if (value.length > 72) return true;
  if (/^(AnnenRute|Sykkelrute|Skiløype|Skiløype|Fotrute)\s+\d+$/i.test(value)) return true;

  return false;
}

export function looksLikeWaterRoute(name?: string | null, category?: string | null) {
  const text = `${category || ''} ${name || ''}`.toLowerCase();

  return [
    'båt',
    'bat',
    'sjø',
    'sjo',
    'padle',
    'kajakk',
    'kano',
    'anker',
    'ankring',
    'havn',
    'farled',
    'ferge',
    'ferry',
  ].some((word) => text.includes(word));
}

export function classifyTrailMode(category?: string | null, name?: string | null): TrailMode {
  const c = normalizeCategory(category).toLowerCase();
  const n = asText(name).toLowerCase();
  const text = `${c} ${n}`;

  if (text.includes('sykkel')) return 'cycling';
  if (text.includes('ski') || text.includes('skiløype') || text.includes('skiløype') || text.includes('loype') || text.includes('løype')) return 'skiing';
  if (text.includes('fot') || text.includes('sti') || text.includes('turveg') || text.includes('turvei') || text.includes('turrute') || text.includes('gå')) return 'walking';

  // Kartverket AnnenRute kan være mange ting. For MVP tillater vi som walking,
  // men looksLikeWaterRoute() filtrerer ut sjø/båt/padling.
  if (text.includes('annenrute') || text.includes('annen rute')) return 'walking';

  return 'unknown';
}

export function getTrailMode(input?: unknown, name?: string | null): TrailMode {
  if (typeof input === 'object' && input !== null) {
    const trail = input as TrailLike;
    const explicit = asText(trail.trail_mode).toLowerCase();
    if (explicit === 'walking' || explicit === 'cycling' || explicit === 'skiing') return explicit;
    return classifyTrailMode(trail.source_category || trail.category || trail.route_type, trail.name);
  }

  if (typeof input === 'string') return classifyTrailMode(input, name);
  return classifyTrailMode(null, name);
}

export function isAppTrailMode(mode?: string | null) {
  return mode === 'walking' || mode === 'cycling' || mode === 'skiing';
}

export function routeKindLabel(modeOrCategory?: string | null) {
  const value = asText(modeOrCategory).toLowerCase();

  if (value.includes('cycling') || value.includes('sykkel')) return 'Sykkelrute';
  if (value.includes('skiing') || value.includes('ski')) return 'Skiløype';
  if (value.includes('walking') || value.includes('fot') || value.includes('sti') || value.includes('tur')) return 'Gåtur';

  return 'Turrute';
}

export function makeFriendlyRouteName(input: TrailLike) {
  const name = asText(input.name);
  const category = normalizeCategory(input.source_category || input.category || input.route_type);
  const distance = numberOrNull(input.distanceKm ?? input.distance_km);
  const km = distance !== null ? `${distance.toFixed(distance < 10 ? 1 : 0)} km` : null;

  if (!isBadImportedName(name)) return name;

  const mode = getTrailMode({ ...input, category });
  const label = routeKindLabel(mode);
  const place = input.municipality || 'Vestfold';
  return km ? `${label} i ${place}, ${km}` : `${label} i ${place}`;
}

// Supports both old calls cleanImportedRouteName(rawName, categoryOrMode, distance)
// and newer object calls cleanImportedRouteName({ name, category, distanceKm }).
export function cleanImportedRouteName(
  input: TrailLike | string | null | undefined,
  categoryOrMode?: string | null,
  distanceKm?: number | null,
) {
  if (typeof input === 'object' && input !== null) return makeFriendlyRouteName(input);

  return makeFriendlyRouteName({
    name: typeof input === 'string' ? input : null,
    category: categoryOrMode ?? null,
    distanceKm: distanceKm ?? null,
  });
}

// Supports both old calls describeImportedRoute(mode, distance)
// and newer object calls describeImportedRoute({ ... }).
export function describeImportedRoute(
  input: TrailLike | string | null | undefined,
  distanceKm?: number | null,
) {
  const trail: TrailLike = typeof input === 'object' && input !== null
    ? input
    : { category: typeof input === 'string' ? input : null, distanceKm: distanceKm ?? null };

  const mode = getTrailMode(trail.category || trail.source_category || trail.route_type || trail.trail_mode, trail.name);
  const label = routeKindLabel(mode);
  const distance = numberOrNull(trail.distanceKm ?? trail.distance_km);
  const distanceText = distance !== null ? `${distance.toFixed(distance < 10 ? 1 : 0)} km` : 'ukjent lengde';

  return `${label} fra Kartverket/Turrutebasen på ${distanceText}. Ruten har ekte geometri, men tilgjengelighet, underlag og praktisk info er ikke kvalitetssikret ennå.`;
}

export function shouldPublishImportedTrail(input: {
  name?: string | null;
  category?: string | null;
  distanceKm?: number | null;
  hasRoute?: boolean;
}) {
  const distance = Number(input.distanceKm || 0);
  const mode = classifyTrailMode(input.category, input.name);

  if (!input.hasRoute) return false;
  if (distance < 0.8) return false;
  if (looksLikeWaterRoute(input.name, input.category)) return false;

  return isAppTrailMode(mode);
}

export function qualityScore(trail: TrailLike) {
  let score = 0;
  const distance = Number(trail.distance_km || trail.distanceKm || 0);
  const mode = getTrailMode(trail);

  if (trail.published !== false) score += 10;
  if (trail.curated) score += 20;
  if (trail.source === 'kartverket_turrutebasen_wfs') score += 15;
  if (hasLineCoordinates(trail.route_geojson)) score += 20;
  if (distance >= 0.8) score += 10;
  if (distance >= 1.2) score += 15;
  if (distance >= 2 && distance <= 15) score += 10;
  if (isAppTrailMode(mode)) score += 10;
  if (looksLikeWaterRoute(trail.name, trail.source_category || trail.category || trail.route_type)) score -= 100;
  if (isBadImportedName(trail.name)) score -= 10;

  return score;
}

export function isDisplayableTrail(trail: TrailLike) {
  if (trail.published === false) return false;
  if (trail.is_demo === true) return false;

  const distance = Number(trail.distance_km || trail.distanceKm || 0);
  if (distance < 0.8) return false;
  if (!hasLineCoordinates(trail.route_geojson)) return false;
  if (looksLikeWaterRoute(trail.name, trail.source_category || trail.category || trail.route_type)) return false;

  return qualityScore(trail) > 0;
}
