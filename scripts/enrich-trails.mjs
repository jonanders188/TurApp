#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_TURRUTE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.TURRUTE_SUPABASE_SERVICE_ROLE_KEY || process.env.TURRUTE_SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const SCHEMA = process.env.NEXT_PUBLIC_TURRUTE_SUPABASE_SCHEMA || 'public';
const MAX_TRAILS = Number(process.env.TURRUTE_ENRICH_MAX_TRAILS || 1000);
const POI_RADIUS_M = Number(process.env.TURRUTE_ENRICH_POI_RADIUS_M || 850);
const ROUTE_SAMPLE_LIMIT = Number(process.env.TURRUTE_ENRICH_ROUTE_SAMPLE_LIMIT || 15);

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase env. Set NEXT_PUBLIC_TURRUTE_SUPABASE_URL and TURRUTE_SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  db: { schema: SCHEMA },
  auth: { persistSession: false, autoRefreshToken: false },
});

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function haversineMeters(a, b) {
  const lat1 = toNumber(a?.lat);
  const lng1 = toNumber(a?.lng);
  const lat2 = toNumber(b?.lat);
  const lng2 = toNumber(b?.lng);
  if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) return Infinity;
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const q = s1 * s1 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * s2 * s2;
  return 2 * R * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}

function sampleRoutePoints(trail) {
  const coords = trail.route_geojson?.coordinates;
  if (!Array.isArray(coords) || coords.length === 0) {
    return trail.lat && trail.lng ? [{ lat: Number(trail.lat), lng: Number(trail.lng) }] : [];
  }
  const points = [];
  const count = Math.min(ROUTE_SAMPLE_LIMIT, coords.length);
  if (count <= 1) {
    const [lng, lat] = coords[0];
    return [{ lat: Number(lat), lng: Number(lng) }];
  }
  for (let i = 0; i < count; i += 1) {
    const idx = Math.round((i * (coords.length - 1)) / (count - 1));
    const pair = coords[idx];
    if (Array.isArray(pair) && pair.length >= 2) points.push({ lat: Number(pair[1]), lng: Number(pair[0]) });
  }
  return points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

function minDistanceToRoute(poi, routePoints) {
  let best = Infinity;
  for (const point of routePoints) best = Math.min(best, haversineMeters(point, poi));
  return best;
}

function classifyPoi(poi) {
  const kind = String(poi.kind || '').toLowerCase();
  const label = String(poi.label || '').toLowerCase();
  const tags = poi.tags || {};
  const amenity = String(tags.amenity || '').toLowerCase();
  const tourism = String(tags.tourism || '').toLowerCase();
  const leisure = String(tags.leisure || '').toLowerCase();
  const natural = String(tags.natural || '').toLowerCase();

  if ([kind, label, amenity].some((v) => v.includes('parking') || v === 'car_park')) return 'parking';
  if ([kind, label, amenity].some((v) => v.includes('toilet') || v === 'toilets')) return 'toilet';
  if ([kind, label, tourism, natural].some((v) => v.includes('viewpoint') || v.includes('utsikt'))) return 'viewpoint';
  if ([kind, label, amenity].some((v) => v.includes('bench') || v.includes('benk'))) return 'bench';
  if ([kind, label, amenity].some((v) => v.includes('cafe') || v.includes('kafe') || v.includes('restaurant'))) return 'cafe';
  if ([kind, label, leisure].some((v) => v.includes('playground') || v.includes('lekeplass'))) return 'playground';
  if ([kind, label, amenity].some((v) => v.includes('drinking_water') || v.includes('water') || v.includes('vann'))) return 'water';
  if ([kind, label, tourism].some((v) => v.includes('picnic'))) return 'picnic';
  return null;
}

function routeKindFromTags(trail, candidate) {
  const name = `${trail.name || ''} ${candidate?.name || ''}`.toLowerCase();
  const tags = candidate?.tags || {};
  const highway = String(tags.highway || '').toLowerCase();
  const surface = String(tags.surface || trail.surface_type || '').toLowerCase();
  const piste = String(tags['piste:type'] || '').toLowerCase();

  if (/kyststi|kyststien|strand|fjord|promenade/.test(name)) return 'Kyststi';
  if (/lysløype|løype|løypa|rundløype|skiløype/.test(name) || piste) return 'Løype';
  if (/natursti|eventyrsti/.test(name)) return 'Natursti';
  if (/runden|rundtur/.test(name) || trail.route_type?.toLowerCase().includes('rund')) return 'Rundtur';
  if (/skog|marka|åsen|kollen|fjell|heia/.test(name)) return 'Skogstur';
  if (highway === 'track' || /gravel|compacted|fine_gravel/.test(surface)) return 'Turvei';
  if (highway === 'path' || /ground|dirt|earth|grass/.test(surface)) return 'Sti';
  return trail.area || 'Tur';
}

function surfaceSummary(trail, candidate) {
  const tags = candidate?.tags || {};
  const surface = String(tags.surface || trail.surface_type || '').toLowerCase();
  const tracktype = String(tags.tracktype || '').toLowerCase();
  const highway = String(tags.highway || '').toLowerCase();

  if (/asphalt|paved/.test(surface)) return 'Asfalt';
  if (/gravel|fine_gravel|compacted/.test(surface) || /grade1|grade2/.test(tracktype)) return 'Grus';
  if (/ground|dirt|earth|grass|woodchips/.test(surface)) return 'Sti / naturunderlag';
  if (highway === 'track') return 'Traktorvei / grusvei';
  if (highway === 'path') return 'Sti';
  return trail.surface_type || null;
}

function isMarked(candidate) {
  const tags = candidate?.tags || {};
  return ['trailblazed', 'osmc:symbol', 'route', 'network'].some((key) => String(tags[key] || '').length > 0)
    || String(tags.marked || '').toLowerCase() === 'yes';
}

function isLit(candidate) {
  const lit = String(candidate?.tags?.lit || '').toLowerCase();
  return lit === 'yes' || lit === 'limited';
}

function boolScore(value, points) {
  return value ? points : 0;
}

function asInt(value) {
  return Number.isFinite(value) ? Math.round(value) : null;
}

async function fetchAll(table, select, queryBuilder) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  while (true) {
    let query = supabase.from(table).select(select).range(from, from + pageSize - 1);
    query = queryBuilder ? queryBuilder(query) : query;
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function main() {
  console.log(`Enriching published trails, max ${MAX_TRAILS}, POI radius ${POI_RADIUS_M} m`);

  const trails = await fetchAll(
    'trails',
    'id,slug,name,municipality,area,distance_km,estimated_minutes,difficulty,route_type,surface_type,elevation_gain_m,suitable_stroller,suitable_baby_carrier,suitable_wheelchair,suitable_easy_walk,suitable_children,suitable_dog,has_parking,has_toilet,has_viewpoint,tags,lat,lng,route_geojson,source,source_route_id,route_quality,route_point_count,quality_score,enrichment_summary',
    (q) => q.eq('published', true).order('quality_score', { ascending: false, nullsFirst: false }).limit(MAX_TRAILS),
  );

  const candidates = await fetchAll(
    'osm_route_candidates',
    'id,osm_type,osm_id,name,tags,point_count,route_quality,quality_score,rejection_reason',
    (q) => q.is('rejection_reason', null),
  );
  const candidateBySourceRouteId = new Map(candidates.map((candidate) => [`${candidate.osm_type}:${candidate.osm_id}`, candidate]));

  const pois = await fetchAll('osm_pois', 'id,kind,label,name,lat,lng,tags', (q) => q.not('lat', 'is', null).not('lng', 'is', null));
  const poiPoints = pois
    .map((poi) => ({ ...poi, lat: Number(poi.lat), lng: Number(poi.lng), poiType: classifyPoi(poi) }))
    .filter((poi) => poi.poiType && Number.isFinite(poi.lat) && Number.isFinite(poi.lng));

  const enrichmentRows = [];
  const trailUpdates = [];

  for (const trail of trails) {
    const candidate = trail.source_route_id ? candidateBySourceRouteId.get(trail.source_route_id) : null;
    const routePoints = sampleRoutePoints(trail);
    const nearby = [];

    for (const poi of poiPoints) {
      const d = minDistanceToRoute(poi, routePoints);
      if (d <= POI_RADIUS_M) nearby.push({ ...poi, distance_m: d });
    }

    const byType = new Map();
    for (const poi of nearby) {
      const list = byType.get(poi.poiType) || [];
      list.push(poi);
      byType.set(poi.poiType, list);
    }

    function minFor(type) {
      const list = byType.get(type) || [];
      if (!list.length) return null;
      return asInt(Math.min(...list.map((poi) => poi.distance_m)));
    }

    const routeKind = routeKindFromTags(trail, candidate);
    const surface = surfaceSummary(trail, candidate);
    const marked = isMarked(candidate);
    const lit = isLit(candidate);
    const parkingDistance = minFor('parking');
    const toiletDistance = minFor('toilet');
    const viewpointDistance = minFor('viewpoint');
    const cafeDistance = minFor('cafe');
    const playgroundDistance = minFor('playground');
    const benchCount = (byType.get('bench') || []).length;
    const waterCount = (byType.get('water') || []).length;

    const hasParking = parkingDistance !== null;
    const hasToilet = toiletDistance !== null;
    const hasViewpoint = viewpointDistance !== null;
    const hasCafe = cafeDistance !== null;
    const hasPlayground = playgroundDistance !== null;

    const easySurface = ['Asfalt', 'Grus', 'Traktorvei / grusvei'].includes(surface || '');
    const amenityScore = boolScore(hasParking, 25) + boolScore(hasToilet, 25) + boolScore(hasViewpoint, 15) + boolScore(hasCafe, 10) + boolScore(hasPlayground, 10) + Math.min(benchCount, 5) * 2;
    const childScore = boolScore(hasToilet, 25) + boolScore(hasPlayground, 25) + boolScore(hasParking, 15) + boolScore(trail.distance_km <= 4, 15) + boolScore(easySurface, 10) + Math.min(benchCount, 4) * 2;
    const strollerScore = boolScore(easySurface, 35) + boolScore(hasParking, 20) + boolScore(hasToilet, 20) + boolScore(trail.distance_km <= 5, 10) + boolScore(!String(candidate?.tags?.sac_scale || '').includes('mountain'), 10);
    const easyScore = boolScore(trail.distance_km <= 5, 25) + boolScore(easySurface, 25) + boolScore((trail.elevation_gain_m || 0) <= 80, 15) + boolScore(hasParking, 10) + boolScore(marked, 10) + boolScore(lit, 5);
    const confidenceScore = Math.min(100, boolScore(routePoints.length >= 5, 20) + boolScore(candidate, 20) + boolScore(surface, 15) + boolScore(marked, 15) + boolScore(nearby.length > 0, 15) + boolScore((trail.route_point_count || 0) >= 80, 15));

    const summary = {
      route_kind: routeKind,
      surface_summary: surface,
      is_marked: marked,
      is_lit: lit,
      has_parking_nearby: hasParking,
      parking_distance_m: parkingDistance,
      has_toilet_nearby: hasToilet,
      toilet_distance_m: toiletDistance,
      has_viewpoint_nearby: hasViewpoint,
      viewpoint_distance_m: viewpointDistance,
      has_cafe_nearby: hasCafe,
      cafe_distance_m: cafeDistance,
      has_playground_nearby: hasPlayground,
      playground_distance_m: playgroundDistance,
      bench_count: benchCount,
      drinking_water_count: waterCount,
      amenity_score: amenityScore,
      child_score: childScore,
      stroller_score: strollerScore,
      easy_score: easyScore,
      confidence_score: confidenceScore,
    };

    enrichmentRows.push({
      trail_id: trail.id,
      surface_summary: surface,
      route_kind: routeKind,
      is_marked: marked,
      is_lit: lit,
      has_parking_nearby: hasParking,
      parking_distance_m: parkingDistance,
      has_toilet_nearby: hasToilet,
      toilet_distance_m: toiletDistance,
      has_viewpoint_nearby: hasViewpoint,
      viewpoint_distance_m: viewpointDistance,
      has_cafe_nearby: hasCafe,
      cafe_distance_m: cafeDistance,
      has_playground_nearby: hasPlayground,
      playground_distance_m: playgroundDistance,
      bench_count: benchCount,
      drinking_water_count: waterCount,
      amenity_score: amenityScore,
      child_score: childScore,
      stroller_score: strollerScore,
      easy_score: easyScore,
      confidence_score: confidenceScore,
      summary,
      updated_at: new Date().toISOString(),
    });

    trailUpdates.push({
      id: trail.id,
      enrichment_summary: summary,
      surface_type: trail.surface_type || surface,
      has_parking: Boolean(trail.has_parking || hasParking),
      has_toilet: Boolean(trail.has_toilet || hasToilet),
      has_viewpoint: Boolean(trail.has_viewpoint || hasViewpoint),
      suitable_easy_walk: Boolean(trail.suitable_easy_walk || easyScore >= 55),
      suitable_children: Boolean(trail.suitable_children || childScore >= 55),
      suitable_stroller: Boolean(trail.suitable_stroller || strollerScore >= 60),
      updated_at: new Date().toISOString(),
    });
  }

  for (let i = 0; i < enrichmentRows.length; i += 500) {
    const batch = enrichmentRows.slice(i, i + 500);
    const { error } = await supabase.from('trail_enrichment').upsert(batch, { onConflict: 'trail_id' });
    if (error) throw new Error(`Failed to upsert trail_enrichment: ${error.message}`);
  }

  for (const update of trailUpdates) {
    const { id, ...fields } = update;
    const { error } = await supabase.from('trails').update(fields).eq('id', id);
    if (error) throw new Error(`Failed to update trail ${id}: ${error.message}`);
  }

  console.log(`Enriched ${enrichmentRows.length} trails.`);
  console.log(`Nearby POIs considered: ${poiPoints.length}.`);
  console.log(`With parking: ${enrichmentRows.filter((r) => r.has_parking_nearby).length}`);
  console.log(`With toilet: ${enrichmentRows.filter((r) => r.has_toilet_nearby).length}`);
  console.log(`Marked: ${enrichmentRows.filter((r) => r.is_marked).length}`);
  console.log(`Lit: ${enrichmentRows.filter((r) => r.is_lit).length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
