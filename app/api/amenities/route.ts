import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase-admin';
import { hasSupabaseAdminConfig } from '@/lib/env';

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
  kind?: string;
  name: string | null;
  lat: number | null;
  lng: number | null;
  tags: Record<string, string>;
  distance_m?: number;
};

function labelFor(tags: Record<string, string>) {
  if (tags.amenity === 'parking') return 'Parkering';
  if (tags.amenity === 'toilets') return 'Toalett';
  if (tags.amenity === 'cafe') return 'Kafé';
  if (tags.amenity === 'bench') return 'Benk';
  if (tags.amenity === 'drinking_water') return 'Drikkevann';
  if (tags.leisure === 'playground') return 'Lekeplass';
  if (tags.tourism === 'viewpoint') return 'Utsiktspunkt';
  if (tags.tourism === 'picnic_site') return 'Rasteplass';
  if (tags.natural === 'beach') return 'Badeplass';
  if (tags.highway === 'bus_stop') return 'Kollektivstopp';
  return 'Punkt';
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function overpassQuery(lat: number, lng: number, radius: number) {
  const around = `${radius},${lat},${lng}`;
  return `
[out:json][timeout:20];
(
  node(around:${around})[amenity~"parking|toilets|cafe|bench|drinking_water"];
  node(around:${around})[leisure=playground];
  node(around:${around})[tourism~"viewpoint|picnic_site"];
  node(around:${around})[natural=beach];
  node(around:${around})[highway=bus_stop];
  way(around:${around})[amenity~"parking|toilets|cafe|bench|drinking_water"];
  way(around:${around})[leisure=playground];
  way(around:${around})[tourism~"viewpoint|picnic_site"];
  way(around:${around})[natural=beach];
);
out center tags 80;
`;
}

async function getStoredAmenities(lat: number, lng: number, radius: number) {
  if (!hasSupabaseAdminConfig()) return null;

  const deltaLat = radius / 111_000;
  const deltaLng = radius / (111_000 * Math.max(Math.cos(lat * Math.PI / 180), 0.2));
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('osm_pois')
    .select('id, osm_type, kind, label, name, lat, lng, tags')
    .gte('lat', lat - deltaLat)
    .lte('lat', lat + deltaLat)
    .gte('lng', lng - deltaLng)
    .lte('lng', lng + deltaLng)
    .limit(400);

  if (error || !data) return null;

  const amenities = data
    .map((item: any) => {
      const distance_m = item.lat && item.lng ? Math.round(haversineMeters(lat, lng, item.lat, item.lng)) : null;
      return {
        id: item.id,
        type: item.osm_type,
        kind: item.kind,
        label: item.label,
        name: item.name,
        lat: item.lat,
        lng: item.lng,
        tags: item.tags || {},
        distance_m,
      } as Amenity;
    })
    .filter((item: Amenity) => typeof item.distance_m === 'number' && item.distance_m <= radius)
    .sort((a: Amenity, b: Amenity) => (a.distance_m ?? 0) - (b.distance_m ?? 0))
    .slice(0, 60);

  return amenities;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
  }

  const { lat, lng, radius } = parsed.data;

  const stored = await getStoredAmenities(lat, lng, radius);
  if (stored && stored.length) {
    const counts = stored.reduce<Record<string, number>>((acc, item) => {
      acc[item.label] = (acc[item.label] || 0) + 1;
      return acc;
    }, {});
    return NextResponse.json({ source: 'supabase-osm-pois', radius, counts, amenities: stored });
  }

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
        const distance_m = pointLat && pointLng ? Math.round(haversineMeters(lat, lng, pointLat, pointLng)) : undefined;
        return { id, type: item.type, label: labelFor(tags), name: tags.name || null, lat: pointLat, lng: pointLng, tags, distance_m };
      })
      .filter((item: Amenity) => {
        const key = `${item.label}:${item.name || item.lat}:${item.lng}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a: Amenity, b: Amenity) => (a.distance_m ?? 999999) - (b.distance_m ?? 999999))
      .slice(0, 40);

    const counts = amenities.reduce<Record<string, number>>((acc, item) => {
      acc[item.label] = (acc[item.label] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({ source: 'openstreetmap-overpass-live', radius, counts, amenities });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
