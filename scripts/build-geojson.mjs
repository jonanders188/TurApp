import fs from 'node:fs';

const trailsPath = new URL('../data/trails.vestfold.json', import.meta.url);
const outPath = new URL('../data/trails.vestfold.geojson', import.meta.url);
const trails = JSON.parse(fs.readFileSync(trailsPath, 'utf8'));

const geojson = {
  type: 'FeatureCollection',
  name: 'Turrute Vestfold demo trails',
  features: trails.map((trail) => ({
    type: 'Feature',
    properties: {
      id: trail.id,
      name: trail.name,
      municipality: trail.municipality,
      area: trail.area,
      distance_km: trail.distance_km,
      estimated_minutes: trail.estimated_minutes,
      difficulty: trail.difficulty,
      surface_type: trail.surface_type,
      elevation_gain_m: trail.elevation_gain_m,
      suitable_stroller: trail.suitable_stroller,
      suitable_baby_carrier: trail.suitable_baby_carrier,
      suitable_wheelchair: trail.suitable_wheelchair,
      suitable_easy_walk: trail.suitable_easy_walk,
      suitable_children: trail.suitable_children,
      suitable_dog: trail.suitable_dog,
      has_parking: trail.has_parking,
      has_toilet: trail.has_toilet,
      has_bench: trail.has_bench,
      has_viewpoint: trail.has_viewpoint,
      has_cafe_nearby: trail.has_cafe_nearby,
      tags: trail.tags,
      description: trail.description,
      data_quality_note: trail.data_quality_note
    },
    geometry: {
      type: 'LineString',
      coordinates: trail.route_coordinates
    }
  }))
};

fs.writeFileSync(outPath, JSON.stringify(geojson, null, 2));
console.log(`Wrote ${outPath.pathname}`);
