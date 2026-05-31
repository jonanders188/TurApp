#!/usr/bin/env node
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const OUT_DIR = 'data/imported';
const BBOX = process.env.TURRUTE_OSM_BBOX || '58.85,9.55,59.75,10.75'; // south,west,north,east
const IMPORT_AREA = process.env.TURRUTE_OSM_IMPORT_AREA || 'vestfold';
const MIN_POINTS = Number(process.env.TURRUTE_OSM_MIN_POINTS || 25);
const MIN_KM = Number(process.env.TURRUTE_OSM_MIN_KM || 0.8);
const MAX_KM = Number(process.env.TURRUTE_OSM_MAX_KM || 18);
const PBF_URL = process.env.TURRUTE_OSM_PBF_URL || 'https://download.geofabrik.de/europe/norway-latest.osm.pbf';
const PBF_PATH = process.env.TURRUTE_OSM_PBF_PATH || path.join(OUT_DIR, 'norway-latest.osm.pbf');
const EXTRACT_PATH = process.env.TURRUTE_OSM_EXTRACT_PATH || path.join(OUT_DIR, `${IMPORT_AREA}-extract.osm.pbf`);
const FILTERED_PATH = process.env.TURRUTE_OSM_FILTERED_PATH || path.join(OUT_DIR, `${IMPORT_AREA}-filtered.osm.pbf`);
const GEOJSON_PATH = process.env.TURRUTE_OSM_GEOJSON_PATH || path.join(OUT_DIR, `${IMPORT_AREA}-geofabrik.geojson`);
const SKIP_DOWNLOAD = process.env.TURRUTE_OSM_SKIP_DOWNLOAD === '1';
const SKIP_OSMIUM = process.env.TURRUTE_OSM_SKIP_OSMIUM === '1';

const POI_DEFINITIONS = [
  { kind: 'parking', label: 'Parkering', key: 'amenity', values: ['parking'] },
  { kind: 'toilet', label: 'Toalett', key: 'amenity', values: ['toilets'] },
  { kind: 'bench', label: 'Benk', key: 'amenity', values: ['bench'] },
  { kind: 'cafe', label: 'Kafé', key: 'amenity', values: ['cafe'] },
  { kind: 'drinking_water', label: 'Drikkevann', key: 'amenity', values: ['drinking_water'] },
  { kind: 'viewpoint', label: 'Utsiktspunkt', key: 'tourism', values: ['viewpoint'] },
  { kind: 'picnic_site', label: 'Rasteplass', key: 'tourism', values: ['picnic_site'] },
  { kind: 'playground', label: 'Lekeplass', key: 'leisure', values: ['playground'] },
  { kind: 'beach', label: 'Badeplass', key: 'natural', values: ['beach'] },
  { kind: 'bus_stop', label: 'Kollektivstopp', key: 'highway', values: ['bus_stop'] },
];


const MUNICIPALITY_CENTERS = [
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

function inferMunicipalityFromPoint(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const nearest = MUNICIPALITY_CENTERS
    .map((m) => ({ name: m.name, km: haversineKm([lng, lat], [m.lng, m.lat]) }))
    .sort((a, b) => a.km - b.km)[0];
  return nearest && nearest.km <= 85 ? nearest.name : null;
}

function inferMunicipalityFromCoords(coords) {
  if (!coords.length) return null;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  if (![minLng, maxLng, minLat, maxLat].every(Number.isFinite)) return null;
  return inferMunicipalityFromPoint((minLat + maxLat) / 2, (minLng + maxLng) / 2);
}

function run(command, args, options = {}) {
  console.log(`$ ${command} ${args.join(' ')}`);
  const res = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(`${command} exited with status ${res.status}`);
}

function checkCommand(command) {
  const res = spawnSync(command, ['--version'], { stdio: 'ignore' });
  return res.status === 0;
}

function parseBbox(bbox) {
  const [south, west, north, east] = bbox.split(',').map(Number);
  if (![south, west, north, east].every(Number.isFinite)) throw new Error(`Invalid TURRUTE_OSM_BBOX: ${bbox}`);
  return { south, west, north, east, osmium: `${west},${south},${east},${north}` };
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'osm-rute';
}

function haversineKm([lon1, lat1], [lon2, lat2]) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function routeLengthKm(coords) {
  let total = 0;
  for (let i = 1; i < coords.length; i += 1) total += haversineKm(coords[i - 1], coords[i]);
  return total;
}

function routeIsLoop(coords) {
  if (coords.length < 2) return false;
  return haversineKm(coords[0], coords[coords.length - 1]) < 0.35;
}

function dedupeConsecutive(coords) {
  const out = [];
  for (const c of coords) {
    if (!Array.isArray(c) || c.length < 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
    const prev = out[out.length - 1];
    if (!prev || Math.abs(prev[0] - c[0]) > 0.000001 || Math.abs(prev[1] - c[1]) > 0.000001) out.push([c[0], c[1]]);
  }
  return out;
}

function flattenLineGeometry(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'LineString') return dedupeConsecutive(geometry.coordinates || []);
  if (geometry.type === 'MultiLineString') return dedupeConsecutive((geometry.coordinates || []).flat());
  return [];
}

function geometryCenter(geometry) {
  if (!geometry) return null;
  if (geometry.type === 'Point') return Array.isArray(geometry.coordinates) ? geometry.coordinates : null;
  const coords = geometry.type === 'Polygon'
    ? (geometry.coordinates?.[0] || [])
    : geometry.type === 'MultiPolygon'
      ? (geometry.coordinates?.[0]?.[0] || [])
      : flattenLineGeometry(geometry);
  if (!coords.length) return null;
  const [lon, lat] = coords.reduce(([a, b], [x, y]) => [a + x, b + y], [0, 0]);
  return [lon / coords.length, lat / coords.length];
}

function publicTags(props = {}) {
  const tags = {};
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('@')) continue;
    if (key === 'id' || key === 'timestamp' || key === 'version' || key === 'changeset' || key === 'user' || key === 'uid') continue;
    tags[key] = value;
  }
  return tags;
}

function osmIdentity(feature, index) {
  const props = feature.properties || {};
  const rawId = String(props['@id'] || props.id || feature.id || `feature-${index}`);
  const match = rawId.match(/^(node|way|relation)[/:](\d+)$/i) || rawId.match(/^(n|w|r)(\d+)$/i);
  if (match) {
    const type = match[1] === 'n' ? 'node' : match[1] === 'w' ? 'way' : match[1] === 'r' ? 'relation' : match[1];
    return { type, id: match[2] };
  }
  const type = props['@type'] || props.type || (feature.geometry?.type === 'Point' ? 'node' : 'way');
  const id = rawId.replace(/[^0-9]/g, '') || String(index + 1);
  return { type, id };
}

function isRouteFeature(feature) {
  const tags = publicTags(feature.properties || {});
  const highway = String(tags.highway || '');
  const route = String(tags.route || '');
  const type = String(tags.type || '');
  const hasLine = ['LineString', 'MultiLineString'].includes(feature.geometry?.type);
  if (!hasLine) return false;
  if (/hiking|foot|walking/i.test(route)) return true;
  if (type === 'route' && /hiking|foot|walking/i.test(route)) return true;
  if (/path|footway|track|pedestrian|steps|bridleway/i.test(highway)) return true;
  return false;
}

function poiKind(tags = {}) {
  for (const def of POI_DEFINITIONS) {
    if (def.values.includes(tags[def.key])) return { kind: def.kind, label: def.label };
  }
  return null;
}

function routeQualityFromScore(score, points) {
  if (score >= 150 && points >= 60) return 'detailed';
  if (score >= 95 && points >= MIN_POINTS) return 'usable';
  if (points >= MIN_POINTS) return 'candidate';
  return 'rough';
}

function qualityScore(coords, tags = {}) {
  const km = routeLengthKm(coords);
  let score = 0;
  score += Math.min(coords.length, 220);
  if (routeIsLoop(coords)) score += 45;
  if (km >= 1.2 && km <= 8) score += 35;
  if (km > 8 && km <= 14) score += 18;
  if (tags.network) score += 8;
  if (tags.name) score += 15;
  if (/kyststi|tursti|natursti|rund|runde|loop|promenade/i.test(tags.name || '')) score += 18;
  if (/asphalt|paved|gravel|fine_gravel/i.test(tags.surface || '')) score += 8;
  return Math.round(score);
}

function municipalityFromTags(tags = {}) {
  const direct = tags['addr:municipality'] || tags.municipality || tags.kommune || tags.kommunenavn;
  if (direct) return String(direct).replace('Tonsberg', 'Tønsberg').replace('Faerder', 'Færder');

  const text = `${tags.operator || ''} ${tags.description || ''} ${tags.name || ''}`;
  for (const name of ['Horten', 'Tønsberg', 'Tonsberg', 'Færder', 'Faerder', 'Larvik', 'Sandefjord', 'Holmestrand', 'Porsgrunn', 'Skien', 'Bamble', 'Siljan']) {
    if (text.toLowerCase().includes(name.toLowerCase())) return name === 'Tonsberg' ? 'Tønsberg' : name === 'Faerder' ? 'Færder' : name;
  }
  return null;
}

function makeRawElement(feature, index) {
  const { type, id } = osmIdentity(feature, index);
  const tags = publicTags(feature.properties || {});
  const kind = isRouteFeature(feature) ? 'route_way' : poiKind(tags)?.kind || 'raw_element';
  const geometry = feature.geometry || null;
  const coords = flattenLineGeometry(geometry);
  const center = geometryCenter(geometry);

  // Do not store the full GeoJSON feature in raw output. A full Vestfold export can be
  // very large, and duplicating every feature inside `raw` caused JSON.stringify to
  // hit RangeError: Invalid string length. Supabase should store useful OSM metadata,
  // not a second copy of the full extract.
  return {
    id: `osm:${type}:${id}`,
    osm_type: type,
    osm_id: String(id),
    element_kind: kind,
    import_area: IMPORT_AREA,
    bbox: BBOX,
    tags,
    geometry,
    lat: center ? center[1] : null,
    lng: center ? center[0] : null,
    point_count: coords.length,
    source: 'geofabrik_pbf',
  };
}

function makePoi(feature, index) {
  const tags = publicTags(feature.properties || {});
  const kind = poiKind(tags);
  if (!kind) return null;
  const center = geometryCenter(feature.geometry);
  if (!center) return null;
  const { type, id } = osmIdentity(feature, index);
  return {
    id: `osm-poi-${type}-${id}-${kind.kind}`,
    osm_raw_element_id: `osm:${type}:${id}`,
    osm_type: type,
    osm_id: String(id),
    kind: kind.kind,
    label: kind.label,
    name: tags.name || null,
    lat: center[1],
    lng: center[0],
    tags,
  };
}

function makeRouteCandidate(feature, index, rejectionReason = null) {
  const { type, id } = osmIdentity(feature, index);
  const tags = publicTags(feature.properties || {});
  const coords = flattenLineGeometry(feature.geometry);
  const km = routeLengthKm(coords);
  const score = coords.length ? qualityScore(coords, tags) : 0;
  const name = tags.name || tags.ref || `${tags.highway || 'OSM-rute'} ${id}`;
  const start = coords[0] || null;
  const isLoop = routeIsLoop(coords);
  const routeQuality = routeQualityFromScore(score, coords.length);
  const publishedCandidate = !rejectionReason && (routeQuality === 'usable' || routeQuality === 'detailed');
  return {
    id: `osm-candidate-${type}-${id}`,
    osm_raw_element_id: `osm:${type}:${id}`,
    osm_type: type,
    osm_id: String(id),
    name,
    municipality: municipalityFromTags(tags) || inferMunicipalityFromCoords(coords) || 'Vestfold',
    area: tags.place || tags.locality || null,
    distance_km: Number(km.toFixed(2)),
    estimated_minutes: Math.max(15, Math.round(km * 17)),
    route_geojson: coords.length ? { type: 'LineString', coordinates: coords } : null,
    start_lat: start ? start[1] : null,
    start_lng: start ? start[0] : null,
    point_count: coords.length,
    route_quality: routeQuality,
    quality_score: score,
    is_loop: isLoop,
    tags,
    published_candidate: publishedCandidate,
    rejection_reason: rejectionReason,
  };
}

function trailFromCandidate(candidate) {
  const tags = candidate.tags || {};
  const km = Number(candidate.distance_km || 0);
  const slugBase = slugify(candidate.name);
  const routeKind = candidate.is_loop ? 'Rundtur' : 'Rute';
  const difficulty = km <= 3.5 ? 'Lett' : km <= 8 ? 'Lett / middels' : 'Middels';
  return {
    id: `osm-${candidate.osm_type}-${candidate.osm_id}`,
    slug: `osm-${slugBase}-${candidate.osm_id}`,
    name: candidate.name,
    municipality: candidate.municipality || 'Vestfold',
    area: candidate.area,
    distance_km: Number(km.toFixed(1)),
    estimated_minutes: candidate.estimated_minutes,
    difficulty,
    route_type: routeKind,
    trail_mode: 'walking',
    surface_type: tags.surface || 'Sti/vei fra OpenStreetMap',
    elevation_gain_m: null,
    suitable_stroller: /asphalt|paved|gravel|fine_gravel/i.test(tags.surface || '') && km <= 4,
    suitable_baby_carrier: true,
    suitable_wheelchair: /asphalt|paved/i.test(tags.surface || '') && km <= 3,
    suitable_easy_walk: km <= 5,
    suitable_children: km <= 6,
    suitable_dog: true,
    has_parking: false,
    has_toilet: false,
    has_viewpoint: /view|utsikt|kyst|coast|fjord/i.test(`${tags.name || ''} ${tags.description || ''}`),
    tags: ['OSM', routeKind, `${candidate.point_count} punkter`, candidate.route_quality === 'detailed' ? 'Detaljert geometri' : 'God geometri'],
    description: `Rute hentet fra lokal OpenStreetMap/Geofabrik-extract med ${candidate.point_count} punkter og cirka ${km.toFixed(1)} km geometri. Brukes som app-rute fordi den har nok punkter til en bedre mobil kartopplevelse.`,
    image_url: null,
    lat: candidate.start_lat,
    lng: candidate.start_lng,
    route_geojson: candidate.route_geojson,
    source: 'osm_geofabrik',
    source_category: candidate.osm_type === 'relation' ? 'osm_route_relation' : 'osm_path_way',
    source_route_id: candidate.osm_id,
    curated: false,
    published: candidate.published_candidate,
    is_demo: false,
    accessibility_verified_at: null,
    data_quality_note: `OSM Geofabrik lokal import. quality_score=${candidate.quality_score}, route_point_count=${candidate.point_count}. Bør fortsatt visuelt kvalitetssikres før bred lansering.`,
    route_quality: candidate.route_quality,
    route_point_count: candidate.point_count,
    quality_score: candidate.quality_score,
  };
}

async function prepareGeojson() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  if (SKIP_OSMIUM && fssync.existsSync(GEOJSON_PATH)) return;

  if (!checkCommand('osmium')) {
    throw new Error('Missing osmium CLI. Install with: brew install osmium-tool');
  }

  if (!fssync.existsSync(PBF_PATH)) {
    if (SKIP_DOWNLOAD) throw new Error(`Missing ${PBF_PATH} and TURRUTE_OSM_SKIP_DOWNLOAD=1`);
    run('curl', ['-L', '--fail', '--continue-at', '-', '-o', PBF_PATH, PBF_URL]);
  }

  const bbox = parseBbox(BBOX);
  run('osmium', ['extract', '--bbox', bbox.osmium, '--overwrite', '-o', EXTRACT_PATH, PBF_PATH]);

  // Export the bbox extract to GeoJSON and filter in Node. This is slower than tags-filter,
  // but more reliable for MVP because it keeps line geometries intact.
  run('osmium', ['export', EXTRACT_PATH, '--overwrite', '-f', 'geojson', '-o', GEOJSON_PATH]);
}

async function main() {
  await prepareGeojson();
  const geojson = JSON.parse(await fs.readFile(GEOJSON_PATH, 'utf8'));
  const features = Array.isArray(geojson.features) ? geojson.features : [];
  const routeFeatures = features.filter(isRouteFeature);
  const poiFeatures = features.filter((feature) => Boolean(poiKind(publicTags(feature.properties || {}))));
  const pois = poiFeatures.map(makePoi).filter(Boolean);

  // Store only OSM elements that are useful for Turrute: route candidates and POIs.
  // The full Geofabrik extract is kept as a local file, not duplicated into JSON/Supabase.
  const usefulByKey = new Map();
  for (const feature of [...routeFeatures, ...poiFeatures]) {
    const { type, id } = osmIdentity(feature, usefulByKey.size);
    usefulByKey.set(`${type}:${id}`, feature);
  }
  const usefulFeatures = [...usefulByKey.values()];
  const rawElements = usefulFeatures.map(makeRawElement);
  const candidates = [];
  const trails = [];
  const rejected = [];

  for (const feature of routeFeatures) {
    const coords = flattenLineGeometry(feature.geometry);
    const km = routeLengthKm(coords);
    let rejectionReason = null;
    if (coords.length < MIN_POINTS) rejectionReason = `for_few_points:${coords.length}`;
    else if (km < MIN_KM) rejectionReason = `too_short:${km.toFixed(2)}`;
    else if (km > MAX_KM) rejectionReason = `too_long:${km.toFixed(2)}`;

    const candidate = makeRouteCandidate(feature, candidates.length, rejectionReason);
    candidates.push(candidate);

    if (rejectionReason) {
      const tags = publicTags(feature.properties || {});
      const { type, id } = osmIdentity(feature, candidates.length);
      rejected.push({ type, id, name: tags.name || null, points: coords.length, km: Number(km.toFixed(2)), reason: rejectionReason });
      continue;
    }

    if (candidate.published_candidate) trails.push(trailFromCandidate(candidate));
  }

  candidates.sort((a, b) => b.quality_score - a.quality_score);
  trails.sort((a, b) => b.quality_score - a.quality_score);

  await fs.writeFile(path.join(OUT_DIR, 'osm-raw-elements.json'), JSON.stringify(rawElements, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'osm-route-candidates.json'), JSON.stringify(candidates, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'osm-pois.json'), JSON.stringify(pois, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'osm-vestfold-trails.json'), JSON.stringify(trails, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'osm-vestfold-rejected.json'), JSON.stringify(rejected, null, 2));

  console.log(`Geofabrik source: ${PBF_PATH}`);
  console.log(`GeoJSON extract: ${GEOJSON_PATH}`);
  console.log(`Read ${features.length} local OSM features.`);
  console.log(`Useful route/POI features: ${usefulFeatures.length}.`);
  console.log(`Stored ${rawElements.length} compact raw elements.`);
  console.log(`Stored ${pois.length} POIs.`);
  console.log(`Route features with geometry: ${routeFeatures.length}.`);
  console.log(`Built ${candidates.length} route candidates.`);
  console.log(`Built ${trails.length} publishable trail rows.`);
  console.log(`Rejected ${rejected.length} short/coarse/too-long route elements.`);
  console.log('Wrote data/imported/osm-*.json');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
