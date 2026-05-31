import type { Trail } from '@/types/trail';

export type TrailMode = 'walking' | 'cycling' | 'skiing' | 'sea' | 'unknown';

export function isBadImportedName(value: unknown) {
  const name = String(value || '').trim();
  if (!name) return true;
  if (/^https?:\/\//i.test(name)) return true;
  if (name.length > 72) return true;
  if (/^app:/i.test(name)) return true;
  if (/^(AnnenRute|Sykkelrute|Skiløype|Fotrute)\s+\d+$/i.test(name)) return true;
  return false;
}

export function classifyTrailMode(kind: unknown, name?: unknown): TrailMode {
  const text = `${String(kind || '')} ${String(name || '')}`.toLowerCase();
  if (text.includes('sykkel')) return 'cycling';
  if (text.includes('ski') || text.includes('løype') || text.includes('loype')) return 'skiing';
  if (text.includes('fot') || text.includes('sti') || text.includes('turveg') || text.includes('turvei')) return 'walking';

  // AnnenRute kan være sjø-, padle-, båt-, kyst- eller andre friluftsruter.
  // Den skal ikke vises som vanlig gåtur uten manuell kuratering.
  if (text.includes('padle') || text.includes('båt') || text.includes('bat') || text.includes('sjø') || text.includes('kystled') || text.includes('anker')) return 'sea';
  if (text.includes('annen')) return 'unknown';
  return 'unknown';
}

export function routeKindLabel(kind: unknown, name?: unknown) {
  const mode = classifyTrailMode(kind, name);
  if (mode === 'cycling') return 'Sykkelrute';
  if (mode === 'skiing') return 'Skiløype';
  if (mode === 'walking') return 'Fotrute';
  if (mode === 'sea') return 'Sjø-/padlerute';
  return 'Annen rute';
}

export function isAppTrailMode(kind: unknown, name?: unknown) {
  const mode = classifyTrailMode(kind, name);
  return mode === 'walking' || mode === 'cycling' || mode === 'skiing';
}

export function cleanImportedRouteName(input: unknown, kind: unknown, distanceKm?: number | null) {
  const raw = String(input || '').trim();
  if (!isBadImportedName(raw)) return raw;
  const label = routeKindLabel(kind, raw);
  const distance = typeof distanceKm === 'number' && Number.isFinite(distanceKm) ? `, ${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km` : '';
  return `${label} i Vestfold${distance}`;
}

export function describeImportedRoute(kind: unknown, distanceKm: number) {
  const label = routeKindLabel(kind).toLowerCase();
  const duration = Math.max(10, Math.round(distanceKm * 18));
  return `Ekte ${label} fra Kartverket/Geonorge Turrutebasen. Ruten er ${distanceKm.toFixed(1)} km og tar omtrent ${duration} minutter i rolig tempo. Tilgjengelighet, underlag, parkering og toalett er ikke verifisert ennå.`;
}

export function getTrailMode(trail: Trail): TrailMode {
  return classifyTrailMode((trail as any).trail_mode || trail.route_type || trail.tags?.join(' '), trail.name);
}

export function isDisplayableTrail(trail: Trail) {
  if (!trail) return false;
  const hasGeometry = Boolean((trail.route_geojson as any)?.coordinates?.length > 1);
  const isImported = trail.source === 'kartverket_turrutebasen_wfs' || trail.source === 'kartverket_turrutebasen_live';

  // Fjern demoturer fra produktvisningen. Appen skal bare vise ekte importerte eller manuelt kuraterte turer.
  if (!isImported && !trail.curated) return false;

  if (!hasGeometry) return false;
  if (Number(trail.distance_km || 0) < 1.2) return false;
  if (isBadImportedName(trail.name)) return false;

  // Ikke vis AnnenRute/sjø-/båt-/ukjent som vanlig tur.
  if (isImported && !isAppTrailMode(trail.route_type || trail.tags?.join(' '), trail.name)) return false;

  return true;
}

export function qualityScore(trail: Trail) {
  let score = 0;
  const mode = getTrailMode(trail);
  if ((trail.route_geojson as any)?.coordinates?.length > 1) score += 25;
  if (trail.source === 'kartverket_turrutebasen_wfs' || trail.source === 'kartverket_turrutebasen_live') score += 15;
  if (trail.curated) score += 30;
  if (trail.distance_km >= 1.2 && trail.distance_km <= 12) score += 12;
  if (trail.distance_km >= 2 && trail.distance_km <= 8) score += 8;
  if (mode === 'walking') score += 12;
  if (mode === 'cycling') score += 8;
  if (mode === 'skiing') score += 6;
  if (mode === 'unknown' || mode === 'sea') score -= 100;
  if (trail.suitable_easy_walk) score += 5;
  if (trail.suitable_children) score += 3;
  if (!isBadImportedName(trail.name)) score += 8;
  return score;
}
