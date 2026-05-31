import fs from 'node:fs';

const path = 'data/trails.vestfold.json';
const trails = JSON.parse(fs.readFileSync(path, 'utf8'));

const defaultShape = [
  [0, 0], [0.001, 0.0005], [0.002, 0], [0.001, -0.0005], [0, 0]
];

for (const trail of trails) {
  if (trail.route_geojson?.coordinates?.length || !trail.lat || !trail.lng) continue;
  trail.route_geojson = {
    type: 'LineString',
    coordinates: defaultShape.map(([dx, dy]) => [
      Number((trail.lng + dx).toFixed(6)),
      Number((trail.lat + dy).toFixed(6)),
    ]),
  };
}

fs.writeFileSync(path, `${JSON.stringify(trails, null, 2)}\n`);
console.log(`Updated ${path} with demo route geometry.`);
