import { NextResponse } from 'next/server';
import { getTrailBySlug } from '@/lib/trails';
import { getTrailCoordinates } from '@/lib/geo';
import { safeGpxFilename, trailToGpx } from '@/lib/gpx';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const { trail } = await getTrailBySlug(slug);

  if (!trail) {
    return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
  }

  const coords = getTrailCoordinates(trail);
  if (coords.length < 2) {
    return NextResponse.json({ error: 'Trail has no route geometry' }, { status: 400 });
  }

  const gpx = trailToGpx(trail);
  return new NextResponse(gpx, {
    status: 200,
    headers: {
      'content-type': 'application/gpx+xml; charset=utf-8',
      'content-disposition': `attachment; filename="${safeGpxFilename(trail.name)}"`,
      'cache-control': 'no-store',
    },
  });
}
