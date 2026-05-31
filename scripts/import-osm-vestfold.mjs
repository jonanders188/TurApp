#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const OVERPASS_URL = process.env.TURRUTE_OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
const BBOX = process.env.TURRUTE_OSM_BBOX || '58.85,9.55,59.75,10.75'; // south,west,north,east
const MIN_POINTS = Number(process.env.TURRUTE_OSM_MIN_POINTS || 25);
const MIN_KM = Number(process.env.TURRUTE_OSM_MIN_KM || 0.8);
const MAX_KM = Number(process.env.TURRUTE_OSM_MAX_KM || 18);
const OUT_DIR = 'data/imported';

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

function relationCoordinates(relation) {
  const ways = (relation.members || [])
    .filter((member) => member.type === 'way' && Array.isArray(member.geometry) && member.geometry.length > 1)
    .map((member) => member.geometry.map((p) => [p.lon, p.lat]));

  if (!ways.length) return [];

  // Enkel sammenkobling: prøv å legge ways etter hverandre basert på nærmeste ende.
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
  score += Math.min(coords.length, 180);
  if (routeIsLoop(coords)) score += 45;
  if (km >= 1.2 && km <= 8) score += 35;
  if (km > 8 && km <= 14) score += 18;
  if (tags.network) score += 8;
  if (tags.name) score += 15;
  if (/kyststi|tursti|natursti|rund|runde|loop/i.test(tags.name || '')) score += 18;
  return Math.round(score);
}

function makeTrail(element, coords, index) {
  const tags = element.tags || {};
  const km = routeLengthKm(coords);
  const score = qualityScore(coords, tags);
  const baseName = tags.name || tags.ref || `OSM turrute ${index + 1}`;
  const slugBase = slugify(baseName);
  const routeKind = routeIsLoop(coords) ? 'Rundtur' : 'Rute';
  const difficulty = km <= 3.5 ? 'Lett' : km <= 8 ? 'Lett / middels' : 'Middels';
  const start = coords[0];

  return {
    id: `osm-${element.type}-${element.id}`,
    slug: `osm-${slugBase}-${element.id}`,
    name: baseName,
    municipality: municipalityFromTags(tags),
    area: tags.place || tags.locality || null,
    distance_km: Number(km.toFixed(1)),
    estimated_minutes: Math.max(15, Math.round(km * 17)),
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
    tags: ['OSM', routeKind, `${coords.length} punkter`, score >= 100 ? 'God geometri' : 'Kandidat'],
    description: `Rutekandidat hentet fra OpenStreetMap med ${coords.length} punkter og cirka ${km.toFixed(1)} km geometri. Må kvalitetssikres før den omtales som anbefalt tur.`,
    image_url: null,
    lat: start ? start[1] : null,
    lng: start ? start[0] : null,
    route_geojson: { type: 'LineString', coordinates: coords },
    source: 'osm_overpass',
    source_category: element.type === 'relation' ? 'osm_route_relation' : 'osm_path_way',
    source_route_id: String(element.id),
    curated: score >= 95,
    published: score >= 95,
    is_demo: false,
    accessibility_verified_at: null,
    data_quality_note: `OSM Overpass import. quality_score=${score}, route_point_count=${coords.length}. Krever visuell godkjenning før offentlig lansering.`,
    route_quality: score >= 140 ? 'detailed' : score >= 95 ? 'usable' : 'candidate',
    route_point_count: coords.length,
    quality_score: score,
  };
}

function overpassQuery() {
  const bbox = BBOX;
  return `
[out:json][timeout:90];
(
  relation["type"="route"]["route"~"hiking|foot|walking"](${bbox});
  way["highway"~"path|footway|track|pedestrian|cycleway"]["name"](${bbox});
);
out tags geom;`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const query = overpassQuery();
  console.log(`Fetching OSM/Overpass routes for bbox ${BBOX}`);
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'user-agent': process.env.TURRUTE_IMPORT_USER_AGENT || 'Turrute OSM import jon@bluestonepim.com',
    },
    body: new URLSearchParams({ data: query }),
  });

  if (!res.ok) throw new Error(`Overpass failed: ${res.status} ${res.statusText}\n${await res.text()}`);
  const json = await res.json();
  const elements = json.elements || [];
  const trails = [];
  const rejected = [];

  for (const element of elements) {
    const coords = element.type === 'relation' ? relationCoordinates(element) : wayCoordinates(element);
    const km = routeLengthKm(coords);
    if (coords.length < MIN_POINTS || km < MIN_KM || km > MAX_KM) {
      rejected.push({ type: element.type, id: element.id, name: element.tags?.name || null, points: coords.length, km: Number(km.toFixed(2)) });
      continue;
    }
    trails.push(makeTrail(element, coords, trails.length));
  }

  trails.sort((a, b) => b.quality_score - a.quality_score);

  await fs.writeFile(path.join(OUT_DIR, 'osm-vestfold-trails.json'), JSON.stringify(trails, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'osm-vestfold-rejected.json'), JSON.stringify(rejected, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'osm-overpass-query.txt'), query.trim() + '\n');

  console.log(`Fetched ${elements.length} OSM elements.`);
  console.log(`Built ${trails.length} OSM trail candidates.`);
  console.log(`Rejected ${rejected.length} short/coarse/too-long elements.`);
  console.log(`Published/curated candidates: ${trails.filter((t) => t.published).length}`);
  console.log('Wrote data/imported/osm-vestfold-trails.json');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
