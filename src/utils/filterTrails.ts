import type { Trail, TrailFilters } from '../types/trail';

const normalize = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function filterTrails(trails: Trail[], filters: TrailFilters): Trail[] {
  return trails.filter((trail) => {
    if (filters.suitable === 'stroller' && !trail.suitable_stroller) return false;
    if (filters.suitable === 'carrier' && !trail.suitable_baby_carrier) return false;
    if (filters.suitable === 'wheelchair' && !trail.suitable_wheelchair) return false;
    if (filters.suitable === 'easy' && !trail.suitable_easy_walk) return false;
    if (filters.suitable === 'children' && !trail.suitable_children) return false;
    if (filters.suitable === 'dog' && !trail.suitable_dog) return false;
    if (filters.maxDistanceKm && trail.distance_km > filters.maxDistanceKm) return false;
    if (filters.maxMinutes && trail.estimated_minutes > filters.maxMinutes) return false;
    if (filters.municipality && trail.municipality !== filters.municipality) return false;
    return true;
  });
}

export function sortTrailsForHome(trails: Trail[]): Trail[] {
  return [...trails].sort((a, b) => {
    const aScore = suitabilityScore(a);
    const bScore = suitabilityScore(b);
    if (bScore !== aScore) return bScore - aScore;
    return a.estimated_minutes - b.estimated_minutes;
  });
}

export function suitabilityScore(trail: Trail): number {
  let score = 0;
  if (trail.suitable_easy_walk) score += 3;
  if (trail.suitable_stroller) score += 3;
  if (trail.suitable_wheelchair) score += 3;
  if (trail.suitable_children) score += 2;
  if (trail.has_toilet) score += 1;
  if (trail.has_parking) score += 1;
  if ((trail.elevation_gain_m ?? 999) <= 20) score += 2;
  if (trail.distance_km <= 3) score += 1;
  return score;
}

export function searchTrails(trails: Trail[], query: string): Trail[] {
  const q = normalize(query);
  return trails.filter((trail) => normalize([
    trail.name,
    trail.municipality,
    trail.area ?? '',
    trail.description,
    trail.tags.join(' '),
    trail.surface_type ?? '',
    trail.route_type ?? '',
  ].join(' ')).includes(q));
}
