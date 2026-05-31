import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getTrails } from '@/lib/trails';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  municipality: z.string().optional(),
  suitable: z.enum(['stroller', 'carrier', 'wheelchair', 'easy', 'children', 'dog']).optional(),
  amenity: z.enum(['parking', 'toilet', 'viewpoint', 'lit', 'marked', 'cafe', 'playground', 'bench']).optional(),
  routeKind: z.string().optional(),
  maxDistanceKm: z.coerce.number().positive().optional(),
  maxMinutes: z.coerce.number().positive().optional(),
  searchPlace: z.string().optional(),
  sted: z.string().optional(),
  q: z.string().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const result = await getTrails({
    ...data,
    searchPlace: data.searchPlace || data.sted || data.q,
  });
  return NextResponse.json(result);
}
