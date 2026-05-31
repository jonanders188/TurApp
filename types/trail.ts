
export type TrailEnrichmentSummary = {
  route_kind?: string | null;
  surface_summary?: string | null;
  is_marked?: boolean;
  is_lit?: boolean;
  has_parking_nearby?: boolean;
  parking_distance_m?: number | null;
  has_toilet_nearby?: boolean;
  toilet_distance_m?: number | null;
  has_viewpoint_nearby?: boolean;
  viewpoint_distance_m?: number | null;
  has_cafe_nearby?: boolean;
  cafe_distance_m?: number | null;
  has_playground_nearby?: boolean;
  playground_distance_m?: number | null;
  bench_count?: number;
  drinking_water_count?: number;
  amenity_score?: number;
  child_score?: number;
  stroller_score?: number;
  easy_score?: number;
  confidence_score?: number;
};

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
  source_category?: string | null;
  source_route_id?: string | null;
  curated?: boolean;
  published?: boolean;
  is_demo?: boolean;
  accessibility_verified_at?: string | null;
  data_quality_note?: string | null;
  route_quality?: 'hidden' | 'candidate' | 'rough' | 'usable' | 'detailed' | string | null;
  route_point_count?: number | null;
  quality_score?: number | null;
  created_at?: string;
  updated_at?: string;
  distance_to_search_km?: number | null;
  enrichment_summary?: TrailEnrichmentSummary | null;
};

export type TrailFilters = {
  municipality?: string;
  suitable?: 'stroller' | 'carrier' | 'wheelchair' | 'easy' | 'children' | 'dog';
  amenity?: 'parking' | 'toilet' | 'viewpoint' | 'lit' | 'marked' | 'cafe' | 'playground' | 'bench';
  routeKind?: string;
  maxDistanceKm?: number;
  maxMinutes?: number;
  searchPlace?: string;
};
