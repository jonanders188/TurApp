import { createBrowserClient } from '@supabase/ssr';
import { getTurruteSupabaseAnonKey, getTurruteSupabaseUrl, TURRUTE_SCHEMA } from '@/lib/env';

export function createClient() {
  return createBrowserClient(
    getTurruteSupabaseUrl(),
    getTurruteSupabaseAnonKey(),
    { db: { schema: TURRUTE_SCHEMA } },
  );
}
