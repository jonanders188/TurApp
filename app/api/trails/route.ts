import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getTrails } from '@/lib/trails';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  municipality: z.string().optional(),
  suitable: z.enum(['stroller', 'carrier', 'wheelchair', 'easy', 'children', 'dog']).optional(),
  maxDistanceKm: z.coerce.number().positive().optional(),
  maxMinutes: z.coerce.number().positive().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await getTrails(parsed.data);
  return NextResponse.json(result);
}
