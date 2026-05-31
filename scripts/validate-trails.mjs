import fs from 'node:fs';

const path = new URL('../data/trails.vestfold.json', import.meta.url);
const trails = JSON.parse(fs.readFileSync(path, 'utf8'));
const required = [
  'id','name','municipality','area','latitude','longitude','distance_km','estimated_minutes',
  'difficulty','surface_type','elevation_gain_m','description'
];
const ids = new Set();
const errors = [];

for (const [index, trail] of trails.entries()) {
  for (const key of required) {
    if (trail[key] === undefined || trail[key] === null || trail[key] === '') {
      errors.push(`Trail ${index}: missing ${key}`);
    }
  }
  if (ids.has(trail.id)) errors.push(`Duplicate id: ${trail.id}`);
  ids.add(trail.id);
  if (!Array.isArray(trail.tags)) errors.push(`${trail.id}: tags must be an array`);
  if (!Array.isArray(trail.route_coordinates) || trail.route_coordinates.length < 2) {
    errors.push(`${trail.id}: route_coordinates should contain at least 2 coordinate pairs`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`OK: ${trails.length} Vestfold trails validated.`);
