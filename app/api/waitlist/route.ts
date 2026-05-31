import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase-admin';
import { hasSupabaseAdminConfig } from '@/lib/env';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
  message: z.string().max(1000).optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }

  let stored = false;
  let storageError: string | null = null;

  if (hasSupabaseAdminConfig()) {
    const supabase = createAdminClient();
    const { error } = await supabase.from('waitlist').upsert(parsed.data, { onConflict: 'email' });
    if (error) storageError = error.message;
    else stored = true;
  }

  const resendKey = process.env.TURRUTE_RESEND_API_KEY || process.env.RESEND_API_KEY;
  const from = process.env.TURRUTE_FROM_EMAIL;
  const to = process.env.TURRUTE_WAITLIST_TO_EMAIL;

  if (resendKey && from && to) {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from,
      to,
      subject: 'Ny Turrute waitlist-registrering',
      text: `Ny registrering:\n\nNavn: ${parsed.data.name ?? '-'}\nE-post: ${parsed.data.email}\nMelding: ${parsed.data.message ?? '-'}`,
    });
  }

  return NextResponse.json({ ok: true, stored, storageError });
}
