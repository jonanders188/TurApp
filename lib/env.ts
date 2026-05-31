export const TURRUTE_SCHEMA = process.env.NEXT_PUBLIC_TURRUTE_SUPABASE_SCHEMA || 'public';

export function getTurruteSupabaseUrl() {
  return process.env.NEXT_PUBLIC_TURRUTE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}

export function getTurruteSupabaseAnonKey() {
  return (
    process.env.NEXT_PUBLIC_TURRUTE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_TURRUTE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  );
}

export function getTurruteSupabaseServiceKey() {
  return (
    process.env.TURRUTE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.TURRUTE_SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  );
}

export function hasSupabaseConfig() {
  return Boolean(getTurruteSupabaseUrl() && getTurruteSupabaseAnonKey());
}

export function hasSupabaseAdminConfig() {
  return Boolean(getTurruteSupabaseUrl() && getTurruteSupabaseServiceKey());
}
