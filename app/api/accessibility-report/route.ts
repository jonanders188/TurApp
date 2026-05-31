import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase-admin';
import { hasSupabaseAdminConfig } from '@/lib/env';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  trail_id: z.string().min(1),
  report_type: z.string().min(1).max(80).default('feedback'),
  message: z.string().min(3).max(1500),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ ok: true, stored: false, note: 'Missing Supabase server key. Accepted in demo mode.' });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('accessibility_reports').insert({
    trail_id: parsed.data.trail_id,
    report_type: parsed.data.report_type,
    message: parsed.data.message,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, stored: true });
}
