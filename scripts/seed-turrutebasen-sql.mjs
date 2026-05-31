#!/usr/bin/env node
import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_TURRUTE_SUPABASE_URL;
const key = process.env.TURRUTE_SUPABASE_SERVICE_ROLE_KEY || process.env.TURRUTE_SUPABASE_SECRET_KEY;
const files = process.argv.slice(2).length ? process.argv.slice(2) : [
  'sql/patches/006_real_turrutebasen_import.sql',
  'data/imported/seed-raw-turruter.sql',
  'data/imported/seed-trails-from-turrutebasen.sql',
];

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_TURRUTE_SUPABASE_URL or TURRUTE_SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

async function main() {
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const file of files) {
    console.log(`Applying ${file}`);
    const sql = await fs.readFile(file, 'utf8');
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error(`Could not apply ${file} through RPC: ${error.message}`);
      console.error('Paste this SQL in Supabase SQL Editor instead, or create an exec_sql RPC for local admin scripts.');
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
