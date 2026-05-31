import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  getTurruteSupabaseAnonKey,
  getTurruteSupabaseUrl,
  hasSupabaseAdminConfig,
  hasSupabaseConfig,
  TURRUTE_SCHEMA,
} from '@/lib/env';
import type { Trail, TrailFilters } from '@/types/trail';
import curatedVestfoldTrails from '@/data/curated-vestfold-trails.json';
import { isDisplayableTrail, qualityScore, sourcePriorityScore } from '@/lib/routeQuality';
import { geocodePlace, sortTrailsByDistanceFromPlace, type GeocodedPlace } from '@/lib/geocoding';

const suitabilityColumn: Record<NonNullable<TrailFilters['suitable']>, keyof Trail> = {
  stroller: 'suitable_stroller',
  carrier: 'suitable_baby_carrier',
  wheelchair: 'suitable_wheelchair',
  easy: 'suitable_easy_walk',
  children: 'suitable_children',
  dog: 'suitable_dog',
};

// Lokal JSON er kun fallback når Supabase ikke kan leses eller ikke har publiserte ruter.
// Produktvisningen skal bruke public.published=true fra Supabase når disse finnes.
export const localVestfoldTrails = curatedVestfoldTrails as Trail[];

type TrailSource = 'supabase' | 'curated-json';

function createReadClient() {
  if (hasSupabaseAdminConfig()) return createAdminClient();

  const url = getTurruteSupabaseUrl();
  const key = getTurruteSupabaseAnonKey();

  if (!url || !key) {
    throw new Error('Missing Turrute Supabase read env vars');
  }

  return createClient(url, key, {
    db: { schema: TURRUTE_SCHEMA },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

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

async function finalizeTrails(
  trails: Trail[],
  filters: TrailFilters,
  source: TrailSource,
  error: string | null = null,
) {
  const filtered = trails
    .filter((trail) => matchesTrailFilters(trail, filters))
    .filter(isDisplayableTrail)
    .sort((a, b) => sourcePriorityScore(b) - sourcePriorityScore(a)
      || qualityScore(b) - qualityScore(a)
      || a.name.localeCompare(b.name, 'no'));

  const ranked = await rankTrailsForSearch(filtered, filters);
  return { trails: ranked.trails, source, error, place: ranked.place };
}

async function getPublishedSupabaseTrails() {
  const supabase = createReadClient();

  // Hent alle publiserte ruter først og filtrer i appen. Da faller vi ikke tilbake
  // til gamle JSON-demoer bare fordi et filter, for eksempel barnevogn, gir 0 treff.
  const { data, error } = await supabase
    .from('trails')
    .select('*')
    .eq('published', true)
    .order('quality_score', { ascending: false, nullsFirst: false })
    .order('name', { ascending: true })
    .limit(1000);

  if (error) throw new Error(error.message);
  return (data ?? []) as Trail[];
}

export async function getTrails(filters: TrailFilters = {}) {
  if (hasSupabaseAdminConfig() || hasSupabaseConfig()) {
    try {
      const supabaseTrails = await getPublishedSupabaseTrails();

      // Supabase er fasit når det finnes publiserte ruter. Ikke bruk lokal fallback
      // for filtre som gir 0 treff, ellers dukker gamle grove curated-ruter opp igjen.
      if (supabaseTrails.length > 0) {
        return finalizeTrails(supabaseTrails, filters, 'supabase', null);
      }

      return finalizeTrails(localVestfoldTrails, filters, 'curated-json', null);
    } catch (error) {
      return finalizeTrails(
        localVestfoldTrails,
        filters,
        'curated-json',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return finalizeTrails(localVestfoldTrails, filters, 'curated-json', null);
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
