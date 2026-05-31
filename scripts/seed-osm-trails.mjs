#!/usr/bin/env node
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_TURRUTE_SUPABASE_URL;
const key = process.env.TURRUTE_SUPABASE_SERVICE_ROLE_KEY;
const schema = process.env.NEXT_PUBLIC_TURRUTE_SUPABASE_SCHEMA || 'public';
const inputPath = process.env.TURRUTE_OSM_TRAILS_JSON || 'data/imported/osm-vestfold-trails.json';
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

const supabase = createClient(url, key, {
  db: { schema },
  auth: { persistSession: false, autoRefreshToken: false },
});

const trails = JSON.parse(await fs.readFile(inputPath, 'utf8'));

if (hideRoughCurated) {
  await supabase
    .from('trails')
    .update({ published: false, data_quality_note: 'Skjult fordi OSM-løftet prioriterer ruter med detaljert geometri.' })
    .eq('source', 'curated_vestfold_v1');
}

for (const rows of chunk(trails, 50)) {
  const { error } = await supabase.from('trails').upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
}

console.log(`Seeded ${trails.length} OSM trail candidates.`);
console.log(`Published candidates: ${trails.filter((trail) => trail.published).length}`);
