import { createClient } from '@supabase/supabase-js';
import { getTurruteSupabaseServiceKey, getTurruteSupabaseUrl, TURRUTE_SCHEMA } from '@/lib/env';

export function createAdminClient() {
  const url = getTurruteSupabaseUrl();
  const key = getTurruteSupabaseServiceKey();

  if (!url || !key) {
    throw new Error('Missing Turrute Supabase admin env vars');
  }

  return createClient(url, key, {
    db: { schema: TURRUTE_SCHEMA },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
