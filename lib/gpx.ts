import type { Trail } from '@/types/trail';
import { getTrailCoordinates } from '@/lib/geo';

function esc(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function trailToGpx(trail: Trail) {
  const coords = getTrailCoordinates(trail);
  const points = coords
    .map(([lng, lat]) => `      <trkpt lat="${lat}" lon="${lng}" />`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Turrute" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${esc(trail.name)}</name>
    <desc>${esc(trail.description)}</desc>
  </metadata>
  <wpt lat="${trail.lat ?? coords[0]?.[1] ?? ''}" lon="${trail.lng ?? coords[0]?.[0] ?? ''}">
    <name>${esc(trail.name)} start</name>
  </wpt>
  <trk>
    <name>${esc(trail.name)}</name>
    <desc>${esc(`${trail.distance_km} km · ${trail.estimated_minutes} min · ${trail.municipality}`)}</desc>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>
`;
}

export function safeGpxFilename(name: string) {
  return `${name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'turrute'}.gpx`;
}
