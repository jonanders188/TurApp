import { createAdminClient } from '@/lib/supabase-admin';
import { hasSupabaseAdminConfig } from '@/lib/env';
import type { Trail, TrailFilters } from '@/types/trail';
import curatedVestfoldTrails from '@/data/curated-vestfold-trails.json';
import { isDisplayableTrail, qualityScore } from '@/lib/routeQuality';
import { geocodePlace, sortTrailsByDistanceFromPlace, type GeocodedPlace } from '@/lib/geocoding';

const suitabilityColumn: Record<NonNullable<TrailFilters['suitable']>, keyof Trail> = {
  stroller: 'suitable_stroller',
  carrier: 'suitable_baby_carrier',
  wheelchair: 'suitable_wheelchair',
  easy: 'suitable_easy_walk',
  children: 'suitable_children',
  dog: 'suitable_dog',
};

// Produktet viser kuraterte turforslag. Rå Turrutebasen-segmenter beholdes som rådata/admin-grunnlag.
export const localVestfoldTrails = curatedVestfoldTrails as Trail[];

export function matchesTrailFilters(trail: Trail, filters: TrailFilters) {
  if (filters.municipality && trail.municipality !== filters.municipality) return false;
  if (filters.maxDistanceKm && trail.distance_km > filters.maxDistanceKm) return false;
  if (filters.maxMinutes && trail.estimated_minutes > filters.maxMinutes) return false;

  if (filters.suitable) {
    return Boolean(trail[suitabilityColumn[filters.suitable]]);
  }

  return true;
}

export function getSuitabilityTags(trail: Trail) {
  return [
    trail.suitable_stroller ? 'Barnevogn' : null,
    trail.suitable_baby_carrier ? 'Bæremeis' : null,
    trail.suitable_wheelchair ? 'Rullestol' : null,
    trail.suitable_easy_walk ? 'Lett å gå' : null,
    trail.suitable_children ? 'Barn' : null,
    trail.suitable_dog ? 'Hund' : null,
  ].filter(Boolean) as string[];
}


async function rankTrailsForSearch(trails: Trail[], filters: TrailFilters) {
  const query = filters.searchPlace?.trim();
  if (!query) return { trails, place: null as GeocodedPlace | null };

  const place = await geocodePlace(query);
  if (!place) return { trails, place: null as GeocodedPlace | null };

  return {
    trails: sortTrailsByDistanceFromPlace(trails, place),
    place,
  };
}

export async function getTrails(filters: TrailFilters = {}) {
  async function finalize(trails: Trail[], source: 'supabase' | 'curated-json', error: string | null = null) {
    const filtered = trails
      .filter((trail) => matchesTrailFilters(trail, filters))
      .filter(isDisplayableTrail)
      .sort((a, b) => qualityScore(b) - qualityScore(a) || a.name.localeCompare(b.name, 'no'));

    const ranked = await rankTrailsForSearch(filtered, filters);
    return { trails: ranked.trails, source, error, place: ranked.place };
  }

  if (hasSupabaseAdminConfig()) {
    try {
      const supabase = createAdminClient();
      let query = supabase
        .from('trails')
        .select('*')
        .eq('published', true)
        .eq('curated', true);

      if (filters.municipality) query = query.eq('municipality', filters.municipality);
      if (filters.maxDistanceKm) query = query.lte('distance_km', filters.maxDistanceKm);
      if (filters.maxMinutes) query = query.lte('estimated_minutes', filters.maxMinutes);
      if (filters.suitable) query = query.eq(String(suitabilityColumn[filters.suitable]), true);

      const { data, error } = await query;
      if (!error && data) {
        const result = await finalize(data as Trail[], 'supabase', null);
        if (result.trails.length > 0) return result;

        // Fallback keeps the app useful if Supabase is empty or filters are too strict.
        return finalize(localVestfoldTrails, 'curated-json', null);
      }

      return finalize(localVestfoldTrails, 'curated-json', error?.message ?? null);
    } catch (error) {
      return finalize(localVestfoldTrails, 'curated-json', error instanceof Error ? error.message : String(error));
    }
  }

  return finalize(localVestfoldTrails, 'curated-json', null);
}

export async function getTrailBySlug(slug: string) {
  const { trails, source, error } = await getTrails();
  return { trail: trails.find((trail) => trail.slug === slug || trail.id === slug) ?? null, source, error };
}

export function getMunicipalities(trails: Trail[]) {
  return Array.from(new Set(trails.map((trail) => trail.municipality))).sort((a, b) => a.localeCompare(b, 'no'));
}

export function getBestTrailNow(trails: Trail[]) {
  return trails
    .slice()
    .sort((a, b) => {
      const aScore = Number(a.suitable_easy_walk) + Number(a.suitable_stroller) + Number(a.suitable_wheelchair) + Number(a.has_toilet) + Number(a.has_parking) - a.distance_km / 10;
      const bScore = Number(b.suitable_easy_walk) + Number(b.suitable_stroller) + Number(b.suitable_wheelchair) + Number(b.has_toilet) + Number(b.has_parking) - b.distance_km / 10;
      return bScore - aScore;
    })[0];
}
