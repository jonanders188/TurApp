#!/usr/bin/env node
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_TURRUTE_SUPABASE_URL;
const key = process.env.TURRUTE_SUPABASE_SERVICE_ROLE_KEY;
const schema = process.env.NEXT_PUBLIC_TURRUTE_SUPABASE_SCHEMA || 'public';
const rawPath = process.env.TURRUTE_OSM_RAW_JSON || 'data/imported/osm-raw-elements.json';
const candidatesPath = process.env.TURRUTE_OSM_CANDIDATES_JSON || 'data/imported/osm-route-candidates.json';
const poisPath = process.env.TURRUTE_OSM_POIS_JSON || 'data/imported/osm-pois.json';
const trailsPath = process.env.TURRUTE_OSM_TRAILS_JSON || 'data/imported/osm-vestfold-trails.json';
const hideRoughCurated = process.argv.includes('--hide-rough-curated');

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_TURRUTE_SUPABASE_URL or TURRUTE_SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function readJson(path, fallback = []) {
  try {
    return JSON.parse(await fs.readFile(path, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function upsertRows(supabase, table, rows, onConflict = 'id') {
  if (!rows.length) return;
  for (const batch of chunk(rows, 50)) {
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) {
      console.error(`Failed to upsert ${table}: ${error.message}`);
      process.exit(1);
    }
  }
}

const supabase = createClient(url, key, {
  db: { schema },
  auth: { persistSession: false, autoRefreshToken: false },
});

const rawElements = await readJson(rawPath);
const candidates = await readJson(candidatesPath);
const pois = await readJson(poisPath);
const trails = await readJson(trailsPath);

if (hideRoughCurated) {
  await supabase
    .from('trails')
    .update({ published: false, data_quality_note: 'Skjult fordi OSM-løftet prioriterer ruter med detaljert geometri.' })
    .eq('source', 'curated_vestfold_v1');
}

await upsertRows(supabase, 'osm_raw_elements', rawElements);
await upsertRows(supabase, 'osm_route_candidates', candidates);
await upsertRows(supabase, 'osm_pois', pois);
await upsertRows(supabase, 'trails', trails);

const links = trails
  .filter((trail) => trail.id && trail.source_route_id)
  .map((trail) => ({
    trail_id: trail.id,
    osm_candidate_id: `osm-candidate-${trail.source_category === 'osm_route_relation' ? 'relation' : 'way'}-${trail.source_route_id}`,
    link_type: 'route_geometry',
    confidence: 1,
  }));

await upsertRows(supabase, 'trail_osm_links', links, 'trail_id,osm_candidate_id,link_type');

console.log(`Seeded ${rawElements.length} OSM raw elements.`);
console.log(`Seeded ${candidates.length} OSM route candidates.`);
console.log(`Seeded ${pois.length} OSM POIs.`);
console.log(`Seeded ${trails.length} published trail rows.`);
console.log(`Linked ${links.length} trails to OSM candidates.`);
console.log(`Published trail rows: ${trails.filter((trail) => trail.published).length}`);
