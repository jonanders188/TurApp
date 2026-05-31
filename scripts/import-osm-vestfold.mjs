#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_OVERPASS_URLS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

const OVERPASS_URLS = (process.env.TURRUTE_OVERPASS_URLS || process.env.TURRUTE_OVERPASS_URL || DEFAULT_OVERPASS_URLS.join(','))
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const BBOX = process.env.TURRUTE_OSM_BBOX || '58.85,9.55,59.75,10.75'; // south,west,north,east
const TILE_DEGREES = Number(process.env.TURRUTE_OSM_TILE_DEGREES || 0.12);
const MAX_TILES = Number(process.env.TURRUTE_OSM_MAX_TILES || 80);
const MIN_POINTS = Number(process.env.TURRUTE_OSM_MIN_POINTS || 25);
const MIN_KM = Number(process.env.TURRUTE_OSM_MIN_KM || 0.8);
const MAX_KM = Number(process.env.TURRUTE_OSM_MAX_KM || 18);
const OUT_DIR = 'data/imported';
const IMPORT_AREA = process.env.TURRUTE_OSM_IMPORT_AREA || 'vestfold';
const INCLUDE_POIS = process.env.TURRUTE_OSM_INCLUDE_POIS !== '0';
const ROUTE_QUERY_MODE = process.env.TURRUTE_OSM_ROUTE_QUERY_MODE || 'marked_and_named'; // marked | marked_and_named
const USER_AGENT = process.env.TURRUTE_IMPORT_USER_AGENT || 'Turrute OSM import jon@bluestonepim.com';

const POI_DEFINITIONS = [
  { kind: 'parking', label: 'Parkering', tag: 'amenity', values: ['parking'] },
  { kind: 'toilet', label: 'Toalett', tag: 'amenity', values: ['toilets'] },
  { kind: 'bench', label: 'Benk', tag: 'amenity', values: ['bench'] },
  { kind: 'cafe', label: 'Kafé', tag: 'amenity', values: ['cafe'] },
  { kind: 'drinking_water', label: 'Drikkevann', tag: 'amenity', values: ['drinking_water'] },
  { kind: 'viewpoint', label: 'Utsiktspunkt', tag: 'tourism', values: ['viewpoint'] },
  { kind: 'picnic_site', label: 'Rasteplass', tag: 'tourism', values: ['picnic_site'] },
  { kind: 'playground', label: 'Lekeplass', tag: 'leisure', values: ['playground'] },
  { kind: 'beach', label: 'Badeplass', tag: 'natural', values: ['beach'] },
  { kind: 'bus_stop', label: 'Kollektivstopp', tag: 'highway', values: ['bus_stop'] },
];

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseBbox(value) {
  const [south, west, north, east] = String(value).split(',').map(Number);
  if (![south, west, north, east].every(Number.isFinite)) throw new Error(`Invalid TURRUTE_OSM_BBOX: ${value}`);
  return { south, west, north, east };
}

function bboxString({ south, west, north, east }) {
  return [south, west, north, east].map((n) => Number(n.toFixed(6))).join(',');
}

function makeTiles(bboxValue, tileDegrees = TILE_DEGREES) {
  const bbox = parseBbox(bboxValue);
  const tiles = [];
  for (let south = bbox.south; south < bbox.north - 1e-9; south += tileDegrees) {
    const north = Math.min(bbox.north, south + tileDegrees);
    for (let west = bbox.west; west < bbox.east - 1e-9; west += tileDegrees) {
      const east = Math.min(bbox.east, west + tileDegrees);
      tiles.push({ south, west, north, east });
    }
  }
  if (tiles.length > MAX_TILES) {
    throw new Error(`OSM bbox creates ${tiles.length} tiles. Increase TURRUTE_OSM_TILE_DEGREES or TURRUTE_OSM_MAX_TILES. Current tile size: ${tileDegrees}`);
  }
  return tiles;
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
  for (let i = 1; i < coords.length; i++) total += haversineKm(coords[i - 1], coords[i]);
  return total;
}

function routeIsLoop(coords) {
  if (coords.length < 2) return false;
  return haversineKm(coords[0], coords[coords.length - 1]) < 0.35;
}

function dedupeConsecutive(coords) {
  const out = [];
  for (const c of coords) {
    const prev = out[out.length - 1];
    if (!prev || Math.abs(prev[0] - c[0]) > 0.000001 || Math.abs(prev[1] - c[1]) > 0.000001) out.push(c);
  }
  return out;
}

function relationCoordinates(relation, wayById = new Map()) {
  const ways = (relation.members || [])
    .filter((member) => member.type === 'way')
    .map((member) => {
      const geometry = Array.isArray(member.geometry) && member.geometry.length > 1
        ? member.geometry
        : wayById.get(String(member.ref || member.id))?.geometry;
      return Array.isArray(geometry) && geometry.length > 1
        ? geometry.map((p) => [p.lon, p.lat])
        : [];
    })
    .filter((coords) => coords.length > 1);

  if (!ways.length) return [];

  const remaining = ways.slice();
  let coords = remaining.shift();

  while (remaining.length) {
    const last = coords[coords.length - 1];
    let bestIndex = 0;
    let bestReverse = false;
    let bestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const way = remaining[i];
      const dStart = haversineKm(last, way[0]);
      const dEnd = haversineKm(last, way[way.length - 1]);
      if (dStart < bestDistance) { bestDistance = dStart; bestIndex = i; bestReverse = false; }
      if (dEnd < bestDistance) { bestDistance = dEnd; bestIndex = i; bestReverse = true; }
    }

    const next = remaining.splice(bestIndex, 1)[0];
    coords = coords.concat(bestReverse ? next.slice().reverse() : next);
  }

  return dedupeConsecutive(coords);
}

function wayCoordinates(way) {
  return Array.isArray(way.geometry) ? dedupeConsecutive(way.geometry.map((p) => [p.lon, p.lat])) : [];
}

function municipalityFromTags(tags = {}) {
  const text = `${tags['addr:municipality'] || ''} ${tags.operator || ''} ${tags.description || ''} ${tags.name || ''}`;
  for (const name of ['Horten', 'Tønsberg', 'Tonsberg', 'Færder', 'Faerder', 'Larvik', 'Sandefjord', 'Holmestrand']) {
    if (text.toLowerCase().includes(name.toLowerCase())) return name === 'Tonsberg' ? 'Tønsberg' : name === 'Faerder' ? 'Færder' : name;
  }
  return 'Vestfold';
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

function routeQualityFromScore(score, points) {
  if (score >= 150 && points >= 60) return 'detailed';
  if (score >= 95 && points >= MIN_POINTS) return 'usable';
  if (points >= MIN_POINTS) return 'candidate';
  return 'rough';
}

function poiKind(tags = {}) {
  for (const def of POI_DEFINITIONS) {
    if (def.values.includes(tags[def.tag])) return { kind: def.kind, label: def.label };
  }
  return null;
}

function elementKind(element) {
  const tags = element.tags || {};
  if (element.type === 'relation' && tags.type === 'route') return 'route_relation';
  if (tags.highway) return 'route_way';
  return poiKind(tags)?.kind || 'raw_element';
}

function rawGeometry(element, wayById = new Map()) {
  if (element.type === 'node') return { type: 'Point', coordinates: [element.lon, element.lat] };
  if (element.type === 'way' && Array.isArray(element.geometry)) return { type: 'LineString', coordinates: wayCoordinates(element) };
  if (element.type === 'relation') {
    const coords = relationCoordinates(element, wayById);
    return coords.length ? { type: 'LineString', coordinates: coords } : null;
  }
  return null;
}

function makeRawElement(element, wayById = new Map()) {
  return {
    id: `osm:${element.type}:${element.id}`,
    osm_type: element.type,
    osm_id: String(element.id),
    element_kind: elementKind(element),
    import_area: IMPORT_AREA,
    bbox: BBOX,
    tags: element.tags || {},
    geometry: rawGeometry(element, wayById),
    raw: element,
  };
}

function elementCenter(element, wayById = new Map()) {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') return [element.lon, element.lat];
  if (element.center && typeof element.center.lat === 'number' && typeof element.center.lon === 'number') return [element.center.lon, element.center.lat];
  const coords = element.type === 'way' ? wayCoordinates(element) : element.type === 'relation' ? relationCoordinates(element, wayById) : [];
  if (!coords.length) return null;
  const [sumLon, sumLat] = coords.reduce(([a, b], [lon, lat]) => [a + lon, b + lat], [0, 0]);
  return [sumLon / coords.length, sumLat / coords.length];
}

function makePoi(element, wayById = new Map()) {
  const tags = element.tags || {};
  const kind = poiKind(tags);
  const center = elementCenter(element, wayById);
  if (!kind || !center) return null;

  return {
    id: `osm-poi-${element.type}-${element.id}-${kind.kind}`,
    osm_raw_element_id: `osm:${element.type}:${element.id}`,
    osm_type: element.type,
    osm_id: String(element.id),
    kind: kind.kind,
    label: kind.label,
    name: tags.name || null,
    lat: center[1],
    lng: center[0],
    tags,
  };
}

function makeRouteCandidate(element, coords, index, rejectionReason = null) {
  const tags = element.tags || {};
  const km = routeLengthKm(coords);
  const score = coords.length ? qualityScore(coords, tags) : 0;
  const baseName = tags.name || tags.ref || `OSM turrute ${index + 1}`;
  const start = coords[0] || null;
  const isLoop = routeIsLoop(coords);
  const quality = routeQualityFromScore(score, coords.length);
  const publishedCandidate = !rejectionReason && (quality === 'usable' || quality === 'detailed');

  return {
    id: `osm-candidate-${element.type}-${element.id}`,
    osm_raw_element_id: `osm:${element.type}:${element.id}`,
    osm_type: element.type,
    osm_id: String(element.id),
    name: baseName,
    municipality: municipalityFromTags(tags),
    area: tags.place || tags.locality || null,
    distance_km: Number(km.toFixed(2)),
    estimated_minutes: Math.max(15, Math.round(km * 17)),
    route_geojson: coords.length ? { type: 'LineString', coordinates: coords } : null,
    start_lat: start ? start[1] : null,
    start_lng: start ? start[0] : null,
    point_count: coords.length,
    route_quality: quality,
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
    description: `Rute hentet fra OpenStreetMap med ${candidate.point_count} punkter og cirka ${km.toFixed(1)} km geometri. Brukes som app-rute fordi den har nok punkter til en bedre mobil kartopplevelse.`,
    image_url: null,
    lat: candidate.start_lat,
    lng: candidate.start_lng,
    route_geojson: candidate.route_geojson,
    source: 'osm_overpass',
    source_category: candidate.osm_type === 'relation' ? 'osm_route_relation' : 'osm_path_way',
    source_route_id: candidate.osm_id,
    curated: true,
    published: candidate.published_candidate,
    is_demo: false,
    accessibility_verified_at: null,
    data_quality_note: `OSM Overpass import. quality_score=${candidate.quality_score}, route_point_count=${candidate.point_count}. Bør fortsatt visuelt kvalitetssikres før bred lansering.`,
    route_quality: candidate.route_quality,
    route_point_count: candidate.point_count,
    quality_score: candidate.quality_score,
  };
}

function routeQuery(tileBbox) {
  const namedWays = ROUTE_QUERY_MODE === 'marked'
    ? ''
    : `  way["name"]["highway"~"path|footway|track|pedestrian|steps"](${tileBbox});`;

  return `
[out:json][timeout:80];
(
  relation["type"="route"]["route"~"hiking|foot|walking"](${tileBbox});
  way["route"~"hiking|foot|walking"](${tileBbox});
${namedWays}
);
out geom;`;
}

function poiQuery(tileBbox) {
  return `
[out:json][timeout:60];
(
  node["amenity"~"parking|toilets|bench|cafe|drinking_water"](${tileBbox});
  way["amenity"~"parking|toilets|bench|cafe|drinking_water"](${tileBbox});
  node["tourism"~"viewpoint|picnic_site"](${tileBbox});
  way["tourism"~"viewpoint|picnic_site"](${tileBbox});
  node["leisure"="playground"](${tileBbox});
  way["leisure"="playground"](${tileBbox});
  node["natural"="beach"](${tileBbox});
  way["natural"="beach"](${tileBbox});
  node["highway"="bus_stop"](${tileBbox});
);
out center;`;
}

async function fetchOverpass(query, label) {
  let lastError = null;
  for (const url of OVERPASS_URLS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            accept: 'application/json',
            'user-agent': USER_AGENT,
          },
          body: new URLSearchParams({ data: query }),
        });

        const text = await res.text();
        if (!res.ok) throw new Error(`Overpass failed: ${res.status} ${res.statusText}\n${text.slice(0, 800)}`);
        return JSON.parse(text).elements || [];
      } catch (error) {
        lastError = error;
        console.warn(`${label} failed on ${url} attempt ${attempt}: ${error.message.split('\n')[0]}`);
        await sleep(1200 * attempt);
      }
    }
  }
  throw lastError;
}

function mergeElements(target, elements) {
  for (const element of elements) {
    const key = `${element.type}:${element.id}`;
    const previous = target.get(key);
    if (!previous) {
      target.set(key, element);
      continue;
    }
    const previousGeom = Array.isArray(previous.geometry) ? previous.geometry.length : 0;
    const nextGeom = Array.isArray(element.geometry) ? element.geometry.length : 0;
    if (nextGeom > previousGeom) target.set(key, { ...previous, ...element, tags: { ...(previous.tags || {}), ...(element.tags || {}) } });
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const tiles = makeTiles(BBOX);
  const routeElementsByKey = new Map();
  const poiElementsByKey = new Map();
  const queries = [];

  console.log(`Smart OSM import for bbox ${BBOX}`);
  console.log(`Tiles: ${tiles.length}, tile size: ${TILE_DEGREES}, route mode: ${ROUTE_QUERY_MODE}, POIs: ${INCLUDE_POIS ? 'yes' : 'no'}`);

  for (const [index, tile] of tiles.entries()) {
    const tileBbox = bboxString(tile);
    console.log(`Tile ${index + 1}/${tiles.length}: ${tileBbox}`);

    const rq = routeQuery(tileBbox);
    queries.push(`-- route tile ${index + 1}: ${tileBbox}\n${rq.trim()}`);
    const routeElements = await fetchOverpass(rq, `route tile ${index + 1}`);
    mergeElements(routeElementsByKey, routeElements);

    if (INCLUDE_POIS) {
      const pq = poiQuery(tileBbox);
      queries.push(`-- poi tile ${index + 1}: ${tileBbox}\n${pq.trim()}`);
      const poiElements = await fetchOverpass(pq, `poi tile ${index + 1}`);
      mergeElements(poiElementsByKey, poiElements);
    }
  }

  const elements = [...routeElementsByKey.values(), ...poiElementsByKey.values()];
  const wayById = new Map(elements
    .filter((element) => element.type === 'way' && Array.isArray(element.geometry) && element.geometry.length > 1)
    .map((element) => [String(element.id), element]));
  const rawElements = elements.map((element) => makeRawElement(element, wayById));
  const pois = elements.map((element) => makePoi(element, wayById)).filter(Boolean);
  const candidates = [];
  const trails = [];
  const rejected = [];

  for (const element of routeElementsByKey.values()) {
    const canBeRoute = (element.type === 'relation' && element.tags?.type === 'route') || (element.type === 'way' && (element.tags?.highway || element.tags?.route));
    if (!canBeRoute) continue;

    const coords = element.type === 'relation' ? relationCoordinates(element, wayById) : wayCoordinates(element);
    const km = routeLengthKm(coords);
    let rejectionReason = null;
    if (coords.length < MIN_POINTS) rejectionReason = `for_few_points:${coords.length}`;
    else if (km < MIN_KM) rejectionReason = `too_short:${km.toFixed(2)}`;
    else if (km > MAX_KM) rejectionReason = `too_long:${km.toFixed(2)}`;

    const candidate = makeRouteCandidate(element, coords, candidates.length, rejectionReason);
    candidates.push(candidate);

    if (rejectionReason) {
      rejected.push({ type: element.type, id: element.id, name: element.tags?.name || null, points: coords.length, km: Number(km.toFixed(2)), reason: rejectionReason });
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
  await fs.writeFile(path.join(OUT_DIR, 'osm-overpass-query.txt'), queries.join('\n\n') + '\n');

  console.log(`Fetched ${elements.length} unique OSM elements.`);
  console.log(`Route elements: ${routeElementsByKey.size}.`);
  console.log(`POI elements: ${poiElementsByKey.size}.`);
  console.log(`Elements with direct way geometry: ${wayById.size}.`);
  console.log(`Route-capable elements with extracted coordinates: ${candidates.filter((candidate) => candidate.point_count > 0).length}.`);
  console.log(`Stored ${rawElements.length} raw elements.`);
  console.log(`Built ${candidates.length} route candidates.`);
  console.log(`Built ${trails.length} publishable trail rows.`);
  console.log(`Stored ${pois.length} POIs.`);
  console.log(`Rejected ${rejected.length} short/coarse/too-long route elements.`);
  console.log('Wrote data/imported/osm-*.json');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
