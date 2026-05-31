#!/usr/bin/env node
import fs from 'node:fs/promises';

const inputPath = process.env.TURRUTE_RAW_TURRUTER_GEOJSON || 'data/imported/turrutebasen-vestfold.raw.geojson';
const jsonOut = 'data/imported/trails.from-turrutebasen.json';
const sqlOut = 'data/imported/seed-trails-from-turrutebasen.sql';
const MAX_TRAILS = Number(process.env.TURRUTE_BUILD_MAX_TRAILS || 120);
const MIN_DISTANCE_KM = Number(process.env.TURRUTE_BUILD_MIN_DISTANCE_KM || 1.2);

function slugify(value) {
  return String(value || 'tur')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'tur';
}

function toLineString(geometry) {
  if (!geometry) return null;
  if (geometry.type === 'LineString') return geometry;
  if (geometry.type === 'MultiLineString' && Array.isArray(geometry.coordinates)) {
    const longest = geometry.coordinates.slice().sort((a, b) => b.length - a.length)[0];
    return longest ? { type: 'LineString', coordinates: longest } : null;
  }
  return null;
}

function haversineKm([lon1, lat1], [lon2, lat2]) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function lengthKm(line) {
  const coords = line?.coordinates || [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) total += haversineKm(coords[i - 1], coords[i]);
  return total;
}

function centroid(line) {
  const coords = line?.coordinates || [];
  if (!coords.length) return [null, null];
  const sums = coords.reduce((acc, [lon, lat]) => [acc[0] + lon, acc[1] + lat], [0, 0]);
  return [sums[0] / coords.length, sums[1] / coords.length];
}

function guessDifficulty(distanceKm) {
  if (distanceKm <= 3) return 'Lett';
  if (distanceKm <= 7) return 'Lett / middels';
  return 'Middels';
}

function classifyTrailMode(kind, name = '') {
  const text = `${String(kind || '')} ${String(name || '')}`.toLowerCase();
  if (text.includes('sykkel')) return 'cycling';
  if (text.includes('ski') || text.includes('løype') || text.includes('loype')) return 'skiing';
  if (text.includes('fot') || text.includes('sti') || text.includes('turveg') || text.includes('turvei')) return 'walking';
  if (text.includes('padle') || text.includes('båt') || text.includes('bat') || text.includes('sjø') || text.includes('kystled') || text.includes('anker')) return 'sea';
  return 'unknown';
}

function isAppTrailMode(mode) {
  return mode === 'walking' || mode === 'cycling' || mode === 'skiing';
}

function routeKindLabel(mode) {
  if (mode === 'cycling') return 'Sykkelrute';
  if (mode === 'skiing') return 'Skiløype';
  if (mode === 'walking') return 'Fotrute';
  if (mode === 'sea') return 'Sjø-/padlerute';
  return 'Annen rute';
}

function isBadName(name) {
  const value = String(name || '').trim();
  return !value || /^https?:\/\//i.test(value) || value.length > 72 || /^app:/i.test(value) || /^(AnnenRute|Sykkelrute|Skiløype|Fotrute)\s+\d+$/i.test(value);
}

function cleanName(name, mode, distanceKm) {
  if (!isBadName(name)) return String(name).trim();
  return `${routeKindLabel(mode)} i Vestfold, ${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
}

function describeRoute(mode, distanceKm) {
  const label = routeKindLabel(mode).toLowerCase();
  const duration = Math.max(10, Math.round(distanceKm * 18));
  return `Ekte ${label} fra Kartverket/Geonorge Turrutebasen. Ruten er ${distanceKm.toFixed(1)} km og tar omtrent ${duration} minutter i rolig tempo. Tilgjengelighet, underlag, parkering og toalett er ikke verifisert ennå.`;
}

function quality(feature, distanceKm, rawName, mode) {
  let score = 0;
  if (distanceKm >= 1.2 && distanceKm <= 12) score += 20;
  if (distanceKm >= 2 && distanceKm <= 8) score += 12;
  if (!isBadName(rawName)) score += 8;
  if (mode === 'walking') score += 18;
  if (mode === 'cycling') score += 12;
  if (mode === 'skiing') score += 8;
  if ((feature.geometry?.coordinates || []).length >= 10) score += 8;
  if (mode === 'unknown' || mode === 'sea') score -= 1000;
  return score;
}

function sqlString(value) { if (value === null || value === undefined) return 'null'; return `'${String(value).replaceAll("'", "''")}'`; }
function sqlNum(value) { return Number.isFinite(value) ? String(value) : 'null'; }
function sqlBool(value) { return value ? 'true' : 'false'; }
function sqlArray(values) { return `array[${values.map(sqlString).join(', ')}]::text[]`; }
function sqlJson(value) { return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`; }

function buildSql(trails) {
  const columns = [
    'id', 'slug', 'name', 'municipality', 'area', 'distance_km', 'estimated_minutes', 'difficulty',
    'route_type', 'trail_mode', 'surface_type', 'elevation_gain_m', 'suitable_stroller', 'suitable_baby_carrier',
    'suitable_wheelchair', 'suitable_easy_walk', 'suitable_children', 'suitable_dog', 'has_parking',
    'has_toilet', 'has_viewpoint', 'tags', 'description', 'image_url', 'lat', 'lng', 'route_geojson',
    'source', 'source_route_id', 'curated', 'data_quality_note'
  ];
  const rows = trails.map((t) => `  (${[
    sqlString(t.id), sqlString(t.slug), sqlString(t.name), sqlString(t.municipality), sqlString(t.area),
    sqlNum(t.distance_km), String(t.estimated_minutes), sqlString(t.difficulty), sqlString(t.route_type), sqlString(t.trail_mode), sqlString(t.surface_type),
    sqlNum(t.elevation_gain_m), sqlBool(t.suitable_stroller), sqlBool(t.suitable_baby_carrier), sqlBool(t.suitable_wheelchair),
    sqlBool(t.suitable_easy_walk), sqlBool(t.suitable_children), sqlBool(t.suitable_dog), sqlBool(t.has_parking), sqlBool(t.has_toilet),
    sqlBool(t.has_viewpoint), sqlArray(t.tags), sqlString(t.description), sqlString(t.image_url), sqlNum(t.lat), sqlNum(t.lng),
    sqlJson(t.route_geojson), sqlString(t.source), sqlString(t.source_route_id), sqlBool(t.curated), sqlString(t.data_quality_note)
  ].join(', ')})`);
  return `-- Generated by scripts/build-trails-from-turrutebasen.mjs\n-- v7: app trails are walking/cycling/skiing only. Demo/AnnenRute should not be shown as normal tours.\n\ninsert into public.trails (${columns.join(', ')})\nvalues\n${rows.join(',\n')}\non conflict (id) do update set\n  slug = excluded.slug,\n  name = excluded.name,\n  municipality = excluded.municipality,\n  area = excluded.area,\n  distance_km = excluded.distance_km,\n  estimated_minutes = excluded.estimated_minutes,\n  difficulty = excluded.difficulty,\n  route_type = excluded.route_type,\n  surface_type = excluded.surface_type,\n  elevation_gain_m = excluded.elevation_gain_m,\n  suitable_stroller = excluded.suitable_stroller,\n  suitable_baby_carrier = excluded.suitable_baby_carrier,\n  suitable_wheelchair = excluded.suitable_wheelchair,\n  suitable_easy_walk = excluded.suitable_easy_walk,\n  suitable_children = excluded.suitable_children,\n  suitable_dog = excluded.suitable_dog,\n  has_parking = excluded.has_parking,\n  has_toilet = excluded.has_toilet,\n  has_viewpoint = excluded.has_viewpoint,\n  tags = excluded.tags,\n  description = excluded.description,\n  image_url = excluded.image_url,\n  lat = excluded.lat,\n  lng = excluded.lng,\n  route_geojson = excluded.route_geojson,\n  source = excluded.source,\n  source_route_id = excluded.source_route_id,\n  curated = excluded.curated,\n  data_quality_note = excluded.data_quality_note,\n  updated_at = now();\n`;
}

async function main() {
  const raw = JSON.parse(await fs.readFile(inputPath, 'utf8'));
  const features = Array.isArray(raw.features) ? raw.features : [];
  const candidates = [];
  let skippedMode = 0;
  let skippedShort = 0;

  for (const feature of features) {
    const line = toLineString(feature.geometry);
    if (!line || !Array.isArray(line.coordinates) || line.coordinates.length < 2) continue;
    const distance = Math.max(0.1, Number(lengthKm(line).toFixed(2)));
    if (distance < MIN_DISTANCE_KM) { skippedShort++; continue; }
    const props = feature.properties || {};
    const kind = props.category || props._app_route_kind || props.layer || 'Turrute';
    const rawName = props._app_name || props.name || props.navn || props.rutenavn || props.objektnavn || '';
    const mode = classifyTrailMode(kind, rawName);
    if (!isAppTrailMode(mode)) { skippedMode++; continue; }
    candidates.push({ feature, line, distance, mode, name: cleanName(rawName, mode, distance), score: quality(feature, distance, rawName, mode) });
  }

  candidates.sort((a, b) => b.score - a.score || b.distance - a.distance);

  const trails = [];
  const used = new Set();
  for (const candidate of candidates) {
    const { feature, line, distance, mode, name } = candidate;
    const [lng, lat] = centroid(line);
    const props = feature.properties || {};
    const sourceId = String(props._source_id || props.source_id || feature.id || `route-${trails.length + 1}`);
    const baseSlug = slugify(`${name}-${sourceId}`);
    let slug = baseSlug;
    let counter = 2;
    while (used.has(slug)) slug = `${baseSlug}-${counter++}`;
    used.add(slug);
    const label = routeKindLabel(mode);

    trails.push({
      id: `turrutebasen-${slug}`.slice(0, 120),
      slug,
      name,
      municipality: props._app_municipality || props.kommune || props.kommunenavn || 'Vestfold',
      area: props.sted || props.omrade || props.område || null,
      distance_km: distance,
      estimated_minutes: Math.max(10, Math.round(distance * 18)),
      difficulty: guessDifficulty(distance),
      route_type: label,
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
      tags: ['Ekte rute', 'Kartverket', label, 'Ikke verifisert'],
      description: describeRoute(mode, distance),
      image_url: null,
      lat,
      lng,
      route_geojson: line,
      source: 'kartverket_turrutebasen_wfs',
      source_route_id: sourceId,
      curated: false,
      data_quality_note: 'Ekte rutegeometri fra Turrutebasen. Tilgjengelighet, underlag og praktisk info må kvalitetssikres. AnnenRute/sjø-/ukjent rute vises ikke som vanlig tur.',
    });
    if (trails.length >= MAX_TRAILS) break;
  }

  await fs.mkdir('data/imported', { recursive: true });
  await fs.writeFile(jsonOut, JSON.stringify(trails, null, 2));
  await fs.writeFile(sqlOut, buildSql(trails));
  console.log(`Built ${trails.length} app trails from ${features.length} raw features.`);
  console.log(`Skipped ${skippedMode} AnnenRute/sea/unknown routes and ${skippedShort} routes shorter than ${MIN_DISTANCE_KM} km.`);
  console.log(`Wrote ${jsonOut}`);
  console.log(`Wrote ${sqlOut}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
