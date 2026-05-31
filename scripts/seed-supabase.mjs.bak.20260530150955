import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const trails = JSON.parse(fs.readFileSync('data/trails.vestfold.json', 'utf8'));
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { error } = await supabase.from('trails').upsert(trails, { onConflict: 'id' });

if (error) {
  console.error(error);
  process.exit(1);
}

console.log(`Seeded ${trails.length} trails`);
