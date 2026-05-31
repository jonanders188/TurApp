import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { hasSupabaseAdminConfig } from '@/lib/env';

export const dynamic = 'force-dynamic';

async function countTable(table: string, query?: (q: any) => any) {
  const supabase = createAdminClient();
  let q = supabase.from(table).select('*', { count: 'exact', head: true });
  if (query) q = query(q);
  const { count, error } = await q;
  return { count: count ?? 0, error: error?.message ?? null };
}

export async function GET() {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ ok: false, error: 'Missing Supabase admin config' }, { status: 500 });
  }

  const [raw, candidates, publishedCandidates, pois, osmTrails, detailedTrails] = await Promise.all([
    countTable('osm_raw_elements'),
    countTable('osm_route_candidates'),
    countTable('osm_route_candidates', (q) => q.eq('published_candidate', true)),
    countTable('osm_pois'),
    countTable('trails', (q) => q.eq('source', 'osm_overpass')),
    countTable('trails', (q) => q.eq('source', 'osm_overpass').in('route_quality', ['usable', 'detailed'])),
  ]);

  return NextResponse.json({
    ok: true,
    counts: {
      raw_elements: raw.count,
      route_candidates: candidates.count,
      published_candidates: publishedCandidates.count,
      pois: pois.count,
      osm_trails: osmTrails.count,
      usable_or_detailed_trails: detailedTrails.count,
    },
    errors: [raw.error, candidates.error, publishedCandidates.error, pois.error, osmTrails.error, detailedTrails.error].filter(Boolean),
  });
}
