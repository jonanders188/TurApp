import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { hasSupabaseAdminConfig } from '@/lib/env';

export const dynamic = 'force-dynamic';

async function safeCount(supabase: ReturnType<typeof createAdminClient>, table: string, query?: (q: any) => any) {
  try {
    let q = supabase.from(table).select('*', { count: 'exact', head: true });
    if (query) q = query(q);
    const { count, error } = await q;
    if (error) return { count: 0, error: error.message };
    return { count: count ?? 0, error: null };
  } catch (error) {
    return { count: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function GET() {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({
      ok: false,
      source: 'local',
      note: 'Mangler Supabase service/secret key. Appen kan vise lokal JSON, men ikke sjekke levende import.',
      counts: { raw_turruter: 0, imported_trails: 0, curated_trails: 0 },
    });
  }

  const supabase = createAdminClient();
  const raw = await safeCount(supabase, 'raw_turruter');
  const imported = await safeCount(supabase, 'trails', (q) => q.eq('source', 'kartverket_turrutebasen_wfs'));
  const curated = await safeCount(supabase, 'trails', (q) => q.eq('curated', true));

  let latestRun = null;
  try {
    const { data } = await supabase.from('import_runs').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
    latestRun = data ?? null;
  } catch {
    latestRun = null;
  }

  return NextResponse.json({
    ok: true,
    source: 'supabase',
    counts: {
      raw_turruter: raw.count,
      imported_trails: imported.count,
      curated_trails: curated.count,
    },
    errors: [raw.error, imported.error, curated.error].filter(Boolean),
    latestRun,
  });
}
