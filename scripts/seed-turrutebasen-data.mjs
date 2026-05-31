#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_TURRUTE_SUPABASE_URL;
const key = process.env.TURRUTE_SUPABASE_SERVICE_ROLE_KEY || process.env.TURRUTE_SUPABASE_SECRET_KEY;
const rawPath = process.env.TURRUTE_RAW_TURRUTER_GEOJSON || 'data/imported/turrutebasen-vestfold.raw.geojson';
const trailsPath = process.env.TURRUTE_IMPORTED_TRAILS_JSON || 'data/imported/trails.from-turrutebasen.json';

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_TURRUTE_SUPABASE_URL or TURRUTE_SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

function bboxForGeometry(geometry) {
  const points = [];
  function walk(coords) {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') points.push(coords);
    else for (const c of coords) walk(c);
  }
  walk(geometry?.coordinates);
  if (!points.length) return null;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function cleanupExistingTrails(supabase) {
  // Fjern gamle demo-turer og tidligere importerte AnnenRute/ukjent-ruter fra vanlig turliste.
  // raw_turruter beholdes som rådatahistorikk.
  await supabase.from('trails').delete().is('source', null);
  await supabase.from('trails').delete().eq('source', 'local-json');
  await supabase.from('trails').delete().in('source', ['kartverket_turrutebasen_wfs', 'kartverket_turrutebasen_live']).eq('route_type', 'Turrute');
  await supabase.from('trails').delete().in('source', ['kartverket_turrutebasen_wfs', 'kartverket_turrutebasen_live']).eq('route_type', 'Annen rute');
  await supabase.from('trails').delete().lt('distance_km', 1.2);
}

async function main() {
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  await cleanupExistingTrails(supabase);
  console.log('Cleaned demo, short, and unknown/AnnenRute trails from trails table.');

  const raw = JSON.parse(await fs.readFile(rawPath, 'utf8'));
  const rawRows = (raw.features || []).map((feature) => {
    const p = feature.properties || {};
    return {
      source: 'kartverket_turrutebasen_wfs',
      source_id: String(p._source_id || feature.id),
      name: p._app_name || p.navn || p.name || null,
      route_kind: p._app_route_kind || p.objekttype || null,
      municipality: p._app_municipality || p.kommune || p.kommunenavn || null,
      properties: p,
      geometry_geojson: feature.geometry,
      bbox: bboxForGeometry(feature.geometry),
    };
  });

  for (const rows of chunk(rawRows, 100)) {
    const { error } = await supabase.from('raw_turruter').upsert(rows, { onConflict: 'source,source_id' });
    if (error) throw error;
  }
  console.log(`Seeded ${rawRows.length} raw_turruter rows.`);

  const trails = JSON.parse(await fs.readFile(trailsPath, 'utf8'));
  for (const rows of chunk(trails, 100)) {
    const { error } = await supabase.from('trails').upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  }
  console.log(`Seeded ${trails.length} trails rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
