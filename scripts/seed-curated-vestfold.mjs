#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import trails from '../data/curated-vestfold-trails.json' with { type: 'json' };

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_TURRUTE_SUPABASE_URL;
const key = process.env.TURRUTE_SUPABASE_SERVICE_ROLE_KEY;
const schema = process.env.NEXT_PUBLIC_TURRUTE_SUPABASE_SCHEMA || 'public';

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_TURRUTE_SUPABASE_URL or TURRUTE_SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, key, {
  db: { schema },
  auth: { persistSession: false, autoRefreshToken: false },
});

await supabase
  .from('trails')
  .update({ published: false, curated: false })
  .in('source', ['kartverket_turrutebasen_wfs', 'kartverket_turrutebasen_live']);

const { error } = await supabase.from('trails').upsert(trails, { onConflict: 'id' });

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`Seeded ${trails.length} curated Vestfold trails.`);
