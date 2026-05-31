import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase-admin';
import { hasSupabaseAdminConfig } from '@/lib/env';
import { fetchTurrutebasenVestfold, upsertTurrutebasenImport } from '@/lib/turrutebasen-live';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const bodySchema = z.object({
  bbox: z.string().optional(),
  maxFeaturesPerLayer: z.coerce.number().min(1).max(1000).optional(),
  maxTrails: z.coerce.number().min(1).max(500).optional(),
  maxLayers: z.coerce.number().min(1).max(20).optional(),
  dryRun: z.boolean().optional().default(false),
});

function authorized(request: Request) {
  const token = process.env.TURRUTE_IMPORT_ADMIN_TOKEN;
  if (!token && process.env.NODE_ENV === 'development') return true;
  if (!token) return false;
  const url = new URL(request.url);
  const provided = request.headers.get('x-turrute-import-token') || url.searchParams.get('token');
  return provided === token;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized. Set TURRUTE_IMPORT_ADMIN_TOKEN and send x-turrute-import-token.' }, { status: 401 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }

  if (!hasSupabaseAdminConfig() && !parsed.data.dryRun) {
    return NextResponse.json({ error: 'Missing Supabase admin config. Add TURRUTE_SUPABASE_SERVICE_ROLE_KEY or use dryRun.' }, { status: 500 });
  }

  try {
    const imported = await fetchTurrutebasenVestfold(parsed.data);

    if (parsed.data.dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        bbox: imported.bbox,
        layersTried: imported.layers.map((layer) => layer.name),
        rawFeatureCount: imported.rawRows.length,
        trailCount: imported.trails.length,
        sampleTrails: imported.trails.slice(0, 5),
        errors: imported.errors,
      });
    }

    const supabase = createAdminClient();
    const saved = await upsertTurrutebasenImport(supabase, imported);

    return NextResponse.json({
      ok: true,
      bbox: imported.bbox,
      layersTried: imported.layers.map((layer) => layer.name),
      saved,
      errors: imported.errors,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
