const BASE = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';
const WEIGHTS_STORAGE_KEY = 'easemove_weights';

export interface ComfortWeights {
  temperature: number;
  humidity: number;
  activity: number;
}

export const DEFAULT_WEIGHTS: ComfortWeights = {
  temperature: 60,
  humidity: 30,
  activity: 10,
};

export interface Precinct {
  id: string;
  name: string;
  comfort_score: number;
  comfort_label: 'Comfortable' | 'Caution' | 'High Risk';
  temperature: number | null;
  humidity: number | null;
  wind_speed: number | null;
  pm25: number | null;
  activity_count: number;
  activity_level: string;
  stale_data: boolean;
  no_sensor_data: boolean;
  last_updated: string;
  lat: number;
  lng: number;
}

export interface TodayRecommendation {
  precinct_id: string;
  date: string;
  recommendation: string;
  recommendation_basis: {
    current_temp: number | null;
    current_humidity: number | null;
    current_activity: string;
  };
  preparation_advice: string[];
}

export interface FurnitureFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    asset_type: string;
    location_desc: string;
    condition_rating: string | number | null;
  };
}

export interface FurnitureFeatureCollection {
  type: 'FeatureCollection';
  features: FurnitureFeature[];
}

function weightsQuery(weights?: ComfortWeights): string {
  if (!weights) return '';
  const params = new URLSearchParams({
    weight_temperature: String(weights.temperature),
    weight_humidity: String(weights.humidity),
    weight_activity: String(weights.activity),
  });
  return `?${params.toString()}`;
}

export function loadWeights(): ComfortWeights {
  try {
    const raw = localStorage.getItem(WEIGHTS_STORAGE_KEY);
    if (!raw) return DEFAULT_WEIGHTS;
    const parsed = JSON.parse(raw) as Partial<ComfortWeights>;
    const weights = {
      temperature: Number(parsed.temperature),
      humidity: Number(parsed.humidity),
      activity: Number(parsed.activity),
    };
    const total = weights.temperature + weights.humidity + weights.activity;
    const valid = Object.values(weights).every(value => Number.isFinite(value) && value >= 0)
      && Math.abs(total - 100) <= 1;
    return valid ? weights : DEFAULT_WEIGHTS;
  } catch {
    return DEFAULT_WEIGHTS;
  }
}

export function saveWeights(weights: ComfortWeights): void {
  localStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(weights));
}

export async function fetchCurrentPrecincts(weights?: ComfortWeights): Promise<Precinct[]> {
  const res = await fetch(`${BASE}/api/precincts/current${weightsQuery(weights)}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.precincts;
}

export async function fetchPrecinctToday(id: string, weights?: ComfortWeights): Promise<TodayRecommendation> {
  const res = await fetch(`${BASE}/api/precincts/${id}/today${weightsQuery(weights)}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchCompare(a: string, b: string, weights?: ComfortWeights): Promise<Precinct[]> {
  const query = new URLSearchParams({
    a,
    b,
    ...(weights ? {
      weight_temperature: String(weights.temperature),
      weight_humidity: String(weights.humidity),
      weight_activity: String(weights.activity),
    } : {}),
  });
  const res = await fetch(`${BASE}/api/precincts/compare?${query.toString()}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.precincts;
}

export async function fetchFurniture(
  precinct: string = 'all',
  type: 'all' | 'drinking_fountain' | 'bicycle_rail' = 'all',
  limit: number = 20
): Promise<FurnitureFeatureCollection> {
  const query = new URLSearchParams({ precinct, type, limit: String(limit) });
  const res = await fetch(`${BASE}/api/furniture?${query.toString()}`);
  if (!res.ok) throw new Error(`Furniture API error: ${res.status}`);
  return res.json();
}
