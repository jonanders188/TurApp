import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getTurruteSupabaseAnonKey, getTurruteSupabaseUrl, TURRUTE_SCHEMA } from '@/lib/env';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getTurruteSupabaseUrl(),
    getTurruteSupabaseAnonKey(),
    {
      db: { schema: TURRUTE_SCHEMA },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always set cookies. Middleware can refresh sessions later.
          }
        },
      },
    },
  );
}
