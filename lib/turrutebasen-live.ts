import type { SupabaseClient } from '@supabase/supabase-js';
import { cleanImportedRouteName, describeImportedRoute, routeKindLabel, classifyTrailMode, isAppTrailMode } from '@/lib/routeQuality';

export type ImportOptions = {
  bbox?: string;
  maxFeaturesPerLayer?: number;
  maxTrails?: number;
  maxLayers?: number;
  baseUrl?: string;
  userAgent?: string;
  minDistanceKm?: number;
};

type WfsLayer = { name: string; title: string };
type GeoJsonFeature = { id?: string; type?: string; properties?: Record<string, any>; geometry?: any };

type ImportOpts = Required<ImportOptions>;

const DEFAULT_BASE_URL = 'https://wfs.geonorge.no/skwms1/wfs.turogfriluftsruter';
const DEFAULT_BBOX = '9.55,58.85,10.75,59.75';

export function defaultImportOptions(): ImportOpts {
  return {
    bbox: process.env.TURRUTE_IMPORT_BBOX || DEFAULT_BBOX,
    maxFeaturesPerLayer: Number(process.env.TURRUTE_IMPORT_MAX_FEATURES || 500),
    maxTrails: Number(process.env.TURRUTE_IMPORT_MAX_TRAILS || 120),
    maxLayers: Number(process.env.TURRUTE_IMPORT_MAX_LAYERS || 6),
    baseUrl: process.env.TURRUTE_TURRUTEBASEN_WFS_BASE_URL || DEFAULT_BASE_URL,
    userAgent: process.env.TURRUTE_IMPORT_USER_AGENT || process.env.TURRUTE_MET_USER_AGENT || 'TurApp import jon@bluestonepim.com',
    minDistanceKm: Number(process.env.TURRUTE_IMPORT_MIN_DISTANCE_KM || 1),
  };
}

function xmlValues(xml: string, tagName: string) {
  const re = new RegExp(`<[^:>]*:?${tagName}[^>]*>([\\s\\S]*?)<\\/[^:>]*:?${tagName}>`, 'gi');
  const values: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) values.push(stripXml(match[1] || ''));
  return values;
}

function stripXml(s: string) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseFeatureTypes(xml: string): WfsLayer[] {
  const blocks = xml.match(/<[^:>]*:?FeatureType[\s\S]*?<\/[^:>]*:?FeatureType>/gi) || [];
  return blocks
    .map((block) => ({ name: xmlValues(block, 'Name')[0] || '', title: xmlValues(block, 'Title')[0] || '' }))
    .filter((item) => item.name);
}

function relevantLayer(item: WfsLayer) {
  const haystack = `${item.name} ${item.title}`.toLowerCase();
  return /annenrute|fotrute|ruteinfopunkt|skil|sykkel|tur|rute|sti|friluft/.test(haystack);
}

async function fetchText(url: string, userAgent: string) {
  const res = await fetch(url, {
    headers: { 'User-Agent': userAgent, Accept: 'application/xml,text/xml,*/*' },
    signal: AbortSignal.timeout(45000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${url} returned ${res.status} ${res.statusText}: ${text.slice(0, 500)}`);
  if (/ExceptionReport|ServiceException/i.test(text)) throw new Error(`${url} returned WFS exception: ${text.slice(0, 700)}`);
  return text;
}

async function fetchCapabilities(baseUrl: string, userAgent: string) {
  const url = `${baseUrl}?service=WFS&request=GetCapabilities`;
  const xml = await fetchText(url, userAgent);
  const preferred = ['app:Fotrute', 'app:Sykkelrute', 'app:Skiløype', 'app:AnnenRute'];
  const found = parseFeatureTypes(xml).filter(relevantLayer);
  const byName = new Map(found.map((layer) => [layer.name, layer]));
  const ordered = preferred.filter((name) => byName.has(name)).map((name) => byName.get(name)!);
  for (const layer of found) if (!ordered.some((x) => x.name === layer.name)) ordered.push(layer);
  return ordered;
}

function findFeatureBlocks(xml: string) {
  const blocks: string[] = [];
  const memberRe = /<(?:\w+:)?(?:member|featureMember)[^>]*>([\s\S]*?)<\/(?:\w+:)?(?:member|featureMember)>/gi;
  let m: RegExpExecArray | null;
  while ((m = memberRe.exec(xml))) blocks.push(m[1] || '');
  return blocks;
}

function xmlText(featureXml: string, localName: string) {
  const re = new RegExp(`<[^>]*:?${localName}[^>]*>([\\s\\S]*?)<\\/[^>]*:?${localName}>`, 'i');
  const m = featureXml.match(re);
  return m ? stripXml(m[1] || '') : '';
}

function parsePosList(featureXml: string): [number, number][] {
  const posListMatch = featureXml.match(/<(?:\w+:)?posList[^>]*>([\s\S]*?)<\/(?:\w+:)?posList>/i);
  if (posListMatch) {
    const nums = (posListMatch[1] || '').trim().split(/\s+/).map(Number).filter(Number.isFinite);
    const coords: [number, number][] = [];
    for (let i = 0; i < nums.length - 1; i += 2) coords.push(toLngLat(nums[i], nums[i + 1]));
    return coords;
  }

  const coords: [number, number][] = [];
  const posRe = /<(?:\w+:)?pos[^>]*>([\s\S]*?)<\/(?:\w+:)?pos>/gi;
  let m: RegExpExecArray | null;
  while ((m = posRe.exec(featureXml))) {
    const nums = (m[1] || '').trim().split(/\s+/).map(Number).filter(Number.isFinite);
    if (nums.length >= 2) coords.push(toLngLat(nums[0], nums[1]));
  }
  return coords;
}

function toLngLat(a: number, b: number): [number, number] {
  // EPSG:4326 from this WFS is often lat lon. GeoJSON wants lon lat.
  if (a >= 57 && a <= 72 && b >= 3 && b <= 32) return [b, a];
  return [a, b];
}

function parseBbox(bbox: string) {
  const [minLon, minLat, maxLon, maxLat] = bbox.split(',').map(Number);
  return { minLon, minLat, maxLon, maxLat };
}

function inBbox(coords: [number, number][], bbox: string) {
  const box = parseBbox(bbox);
  return coords.some(([lon, lat]) => lon >= box.minLon && lon <= box.maxLon && lat >= box.minLat && lat <= box.maxLat);
}

function haversineKm([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function lengthKm(line: any) {
  const coords = line?.coordinates || [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) total += haversineKm(coords[i - 1], coords[i]);
  return total;
}

function centroid(line: any) {
  const coords = line?.coordinates || [];
  if (!coords.length) return [null, null];
  const sums = coords.reduce((acc: [number, number], point: any) => [acc[0] + Number(point[0]), acc[1] + Number(point[1])], [0, 0]);
  return [sums[0] / coords.length, sums[1] / coords.length];
}

function bboxForGeometry(geometry: any) {
  const points: [number, number][] = [];
  function walk(coords: any) {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') points.push([Number(coords[0]), Number(coords[1])]);
    else for (const c of coords) walk(c);
  }
  walk(geometry?.coordinates);
  if (!points.length) return null;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

function slugify(value: string) {
  return String(value || 'tur')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'tur';
}

function guessDifficulty(distanceKm: number) {
  if (distanceKm <= 3) return 'Lett';
  if (distanceKm <= 7) return 'Lett / middels';
  return 'Middels';
}

async function fetchLayer(baseUrl: string, layerName: string, opts: ImportOpts) {
  const params = new URLSearchParams({
    service: 'WFS',
    request: 'GetFeature',
    version: '2.0.0',
    typeNames: layerName,
    count: String(opts.maxFeaturesPerLayer),
  });
  const xml = await fetchText(`${baseUrl}?${params.toString()}`, opts.userAgent);
  const blocks = findFeatureBlocks(xml);
  const features: GeoJsonFeature[] = [];

  blocks.forEach((block, index) => {
    const coords = parsePosList(block);
    if (coords.length < 2) return;
    if (!inBbox(coords, opts.bbox)) return;
    const sourceId = block.match(/gml:id="([^"]+)"/i)?.[1] || block.match(/fid="([^"]+)"/i)?.[1] || `${layerName}-${index}`;
    const rawKind = layerName.replace('app:', '');
    const rawName = xmlText(block, 'navn') || xmlText(block, 'rutenavn') || xmlText(block, 'rutemerking') || xmlText(block, 'objektnavn') || '';
    const line = { type: 'LineString', coordinates: coords };
    const distance = Number(lengthKm(line).toFixed(2));
    if (distance < opts.minDistanceKm) return;
    const name = cleanImportedRouteName(rawName, rawKind, distance);
    features.push({
      type: 'Feature',
      id: sourceId,
      properties: {
        _source: 'kartverket_turrutebasen_wfs',
        _source_id: sourceId,
        _source_layer: layerName,
        _app_name: name,
        _app_route_kind: routeKindLabel(rawKind),
        _app_municipality: 'Vestfold',
        name,
        category: routeKindLabel(rawKind),
        layer: layerName,
        distance_km_estimated: distance,
        imported_at: new Date().toISOString(),
      },
      geometry: line,
    });
  });

  return features;
}

function featureToRawRow(feature: GeoJsonFeature) {
  const p = feature.properties || {};
  return {
    source: 'kartverket_turrutebasen_wfs',
    source_id: String(p._source_id || feature.id),
    name: p._app_name || p.navn || p.name || null,
    route_kind: p._app_route_kind || p.objekttype || p.category || null,
    municipality: p._app_municipality || p.kommune || p.kommunenavn || null,
    properties: p,
    geometry_geojson: feature.geometry,
    bbox: bboxForGeometry(feature.geometry),
  };
}

function featureToTrail(feature: GeoJsonFeature, usedSlugs: Set<string>, index: number) {
  const line = feature.geometry;
  if (!line || !Array.isArray(line.coordinates) || line.coordinates.length < 2) return null;
  const props = feature.properties || {};
  const distance = Math.max(0.1, Number(lengthKm(line).toFixed(2)));
  const [lng, lat] = centroid(line);
  const sourceId = String(props._source_id || feature.id || `route-${index + 1}`);
  const kind = props._app_route_kind || props.category || 'Turrute';
  const rawName = props._app_name || props.name || props.navn;
  const mode = classifyTrailMode(kind, rawName);
  if (!isAppTrailMode(mode)) return null;
  const baseName = cleanImportedRouteName(rawName, mode, distance).slice(0, 120);
  const baseSlug = slugify(`${baseName}-${sourceId}`);
  let slug = baseSlug;
  let counter = 2;
  while (usedSlugs.has(slug)) slug = `${baseSlug}-${counter++}`;
  usedSlugs.add(slug);

  return {
    id: `turrutebasen-${slug}`.slice(0, 120),
    slug,
    name: baseName,
    municipality: props._app_municipality || props.kommune || props.kommunenavn || 'Vestfold',
    area: props.sted || props.omrade || props.område || null,
    distance_km: distance,
    estimated_minutes: Math.max(10, Math.round(distance * 18)),
    difficulty: guessDifficulty(distance),
    route_type: routeKindLabel(mode),
    trail_mode: mode,
    surface_type: null,
    elevation_gain_m: null,
    suitable_stroller: false,
    suitable_baby_carrier: mode === 'walking' && distance <= 8,
    suitable_wheelchair: false,
    suitable_easy_walk: mode === 'walking' && distance <= 4,
    suitable_children: mode === 'walking' && distance <= 6,
    suitable_dog: mode !== 'skiing',
    has_parking: false,
    has_toilet: false,
    has_viewpoint: false,
    tags: ['Ekte rute', 'Kartverket', routeKindLabel(mode), 'Ikke verifisert'],
    description: describeImportedRoute(mode, distance),
    image_url: null,
    lat,
    lng,
    route_geojson: line,
    source: 'kartverket_turrutebasen_wfs',
    source_route_id: sourceId,
    curated: false,
    data_quality_note: 'Ekte rutegeometri fra Turrutebasen. Tilgjengelighet, underlag og praktisk info må kvalitetssikres. AnnenRute/sjø-/ukjent rute vises ikke som vanlig tur.',
  };
}

export async function fetchTurrutebasenVestfold(options: ImportOptions = {}) {
  const opts = { ...defaultImportOptions(), ...options };
  const layers = (await fetchCapabilities(opts.baseUrl, opts.userAgent)).slice(0, opts.maxLayers);
  const features: GeoJsonFeature[] = [];
  const errors: { layer: string; error: string }[] = [];

  for (const layer of layers) {
    try {
      const layerFeatures = await fetchLayer(opts.baseUrl, layer.name, opts);
      features.push(...layerFeatures);
    } catch (error) {
      errors.push({ layer: layer.name, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const seen = new Set<string>();
  const unique = features.filter((feature) => {
    const p = feature.properties || {};
    const key = `${p._source_layer}:${p._source_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const usedSlugs = new Set<string>();
  const trails = unique
    .map((feature, index) => featureToTrail(feature, usedSlugs, index))
    .filter(Boolean)
    .slice(0, opts.maxTrails);

  return { bbox: opts.bbox, layers, errors, features: unique, rawRows: unique.map(featureToRawRow), trails };
}

function chunk<T>(arr: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function cleanupAppTrails(supabase: SupabaseClient<any, any, any>) {
  await supabase.from('trails').delete().is('source', null);
  await supabase.from('trails').delete().eq('source', 'local-json');
  await supabase.from('trails').delete().eq('source', 'demo');
  await supabase.from('trails').delete().in('source', ['kartverket_turrutebasen_wfs', 'kartverket_turrutebasen_live']).eq('route_type', 'Turrute');
  await supabase.from('trails').delete().in('source', ['kartverket_turrutebasen_wfs', 'kartverket_turrutebasen_live']).eq('route_type', 'Annen rute');
  await supabase.from('trails').delete().in('source', ['kartverket_turrutebasen_wfs', 'kartverket_turrutebasen_live']).eq('route_type', 'Sjø-/padlerute');
  await supabase.from('trails').delete().lt('distance_km', 1.2);
}

export async function upsertTurrutebasenImport(supabase: SupabaseClient<any, any, any>, payload: Awaited<ReturnType<typeof fetchTurrutebasenVestfold>>) {
  await cleanupAppTrails(supabase);

  for (const rows of chunk(payload.rawRows, 100)) {
    const { error } = await supabase.from('raw_turruter').upsert(rows, { onConflict: 'source,source_id' });
    if (error) throw error;
  }

  for (const rows of chunk(payload.trails as any[], 100)) {
    const { error } = await supabase.from('trails').upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  }

  try {
    await supabase.from('import_runs').insert({
      source: 'kartverket_turrutebasen_wfs',
      status: payload.errors.length ? 'completed_with_warnings' : 'completed',
      bbox: payload.bbox,
      feature_count: payload.rawRows.length,
      trail_count: payload.trails.length,
      error: payload.errors.length ? JSON.stringify(payload.errors.slice(0, 5)) : null,
    });
  } catch {
    // import_runs is helpful, but optional if the SQL patch has not been run yet.
  }

  return { rawRows: payload.rawRows.length, trails: payload.trails.length };
}
