export type Difficulty = 'Lett' | 'Lett / middels' | 'Middels' | 'Krevende';

export type RouteGeoJson = {
  type: 'LineString';
  coordinates: [number, number][];
};

export type Trail = {
  id: string;
  slug: string;
  name: string;
  municipality: string;
  area: string | null;
  distance_km: number;
  estimated_minutes: number;
  difficulty: Difficulty | string;
  route_type: string | null;
  trail_mode?: 'walking' | 'cycling' | 'skiing' | 'sea' | 'unknown' | null;
  surface_type: string | null;
  elevation_gain_m: number | null;
  suitable_stroller: boolean;
  suitable_baby_carrier: boolean;
  suitable_wheelchair: boolean;
  suitable_easy_walk: boolean;
  suitable_children: boolean;
  suitable_dog: boolean;
  has_parking: boolean;
  has_toilet: boolean;
  has_viewpoint: boolean;
  tags: string[];
  description: string;
  image_url: string | null;
  lat: number | null;
  lng: number | null;
  route_geojson?: RouteGeoJson | null;
  source?: string | null;
  source_route_id?: string | null;
  curated?: boolean;
  accessibility_verified_at?: string | null;
  data_quality_note?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type TrailFilters = {
  municipality?: string;
  suitable?: 'stroller' | 'carrier' | 'wheelchair' | 'easy' | 'children' | 'dog';
  maxDistanceKm?: number;
  maxMinutes?: number;
};
