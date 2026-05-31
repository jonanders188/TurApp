import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(50).max(3000).default(900),
});

type Amenity = {
  id: string;
  type: string;
  label: string;
  name: string | null;
  lat: number | null;
  lng: number | null;
  tags: Record<string, string>;
};

function labelFor(tags: Record<string, string>) {
  if (tags.amenity === 'parking') return 'Parkering';
  if (tags.amenity === 'toilets') return 'Toalett';
  if (tags.amenity === 'cafe') return 'Kafé';
  if (tags.amenity === 'bench') return 'Benk';
  if (tags.leisure === 'playground') return 'Lekeplass';
  if (tags.tourism === 'viewpoint') return 'Utsiktspunkt';
  if (tags.tourism === 'picnic_site') return 'Rasteplass';
  return 'Punkt';
}

function overpassQuery(lat: number, lng: number, radius: number) {
  const around = `${radius},${lat},${lng}`;
  return `
[out:json][timeout:20];
(
  node(around:${around})[amenity=parking];
  node(around:${around})[amenity=toilets];
  node(around:${around})[amenity=cafe];
  node(around:${around})[amenity=bench];
  node(around:${around})[leisure=playground];
  node(around:${around})[tourism=viewpoint];
  node(around:${around})[tourism=picnic_site];
  way(around:${around})[amenity=parking];
  way(around:${around})[leisure=playground];
  way(around:${around})[tourism=viewpoint];
  way(around:${around})[tourism=picnic_site];
);
out center tags 60;
`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
  }

  const { lat, lng, radius } = parsed.data;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': process.env.TURRUTE_IMPORT_USER_AGENT || 'TurApp amenities jon@bluestonepim.com',
      },
      body: new URLSearchParams({ data: overpassQuery(lat, lng, radius) }),
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Overpass returned ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    const seen = new Set<string>();
    const amenities: Amenity[] = (data.elements || [])
      .map((item: any) => {
        const tags = item.tags || {};
        const id = `${item.type}-${item.id}`;
        const pointLat = item.lat ?? item.center?.lat ?? null;
        const pointLng = item.lon ?? item.center?.lon ?? null;
        return {
          id,
          type: item.type,
          label: labelFor(tags),
          name: tags.name || null,
          lat: pointLat,
          lng: pointLng,
          tags,
        };
      })
      .filter((item: Amenity) => {
        const key = `${item.label}:${item.name || item.lat}:${item.lng}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 40);

    const counts = amenities.reduce<Record<string, number>>((acc, item) => {
      acc[item.label] = (acc[item.label] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({ source: 'openstreetmap-overpass', radius, counts, amenities });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
