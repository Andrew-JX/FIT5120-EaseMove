import { fetchFurniture, type FurnitureFeature } from "./api";

export type SupportedFacilityKind = "bicycle" | "drinking" | "seat";

export const SUPPORTED_FACILITY_KINDS: SupportedFacilityKind[] = [
  "bicycle",
  "drinking",
  "seat",
];

export type NearbyFacility = {
  id: string;
  kind: SupportedFacilityKind;
  name: string;
  typeLabel: string;
  distanceMeters: number;
  conditionRating: number | string | null;
  locationDescription: string;
  lat: number;
  lng: number;
};

export type NearbyFacilitySlot = {
  kind: SupportedFacilityKind;
  typeLabel: string;
  facility: NearbyFacility | null;
};

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function classifySupportedFacility(
  assetType: string | null | undefined
): SupportedFacilityKind | null {
  const type = normalizeText(assetType).toLowerCase();
  if (type.includes("bicycle")) return "bicycle";
  if (type.includes("drinking")) return "drinking";
  if (type.includes("seat")) return "seat";
  return null;
}

export function getSupportedFacilityTypeLabel(kind: SupportedFacilityKind): string {
  if (kind === "bicycle") return "Bicycle Rack";
  if (kind === "drinking") return "Drinking Fountain";
  return "Public Seating";
}

function readCoordinates(feature: FurnitureFeature): { lat: number; lng: number } | null {
  const [lng, lat] = feature.geometry.coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceMeters(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const earthRadiusMeters = 6371000;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function buildFacilityName(
  kind: SupportedFacilityKind,
  locationDescription: string,
  fallbackIndex: number
): string {
  const cleaned = normalizeText(locationDescription);
  if (cleaned) return cleaned;
  return `${getSupportedFacilityTypeLabel(kind)} ${fallbackIndex + 1}`;
}

function mergeAndDedupe(features: FurnitureFeature[]): FurnitureFeature[] {
  return Array.from(
    new Map(
      features.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const key = `${lat},${lng},${normalizeText(feature.properties.asset_type).toLowerCase()}`;
        return [key, feature] as const;
      })
    ).values()
  );
}

let facilitiesCatalogPromise: Promise<FurnitureFeature[]> | null = null;

export async function fetchSupportedFacilitiesCatalog(): Promise<FurnitureFeature[]> {
  if (!facilitiesCatalogPromise) {
    facilitiesCatalogPromise = Promise.all([
      fetchFurniture("all", "all", 3000),
      fetchFurniture("all", "drinking_fountain", 3000),
    ])
      .then(async ([allData, drinkingData]) => {
        const merged = mergeAndDedupe([...(allData.features ?? []), ...(drinkingData.features ?? [])]);
        if (merged.length > 0) return merged;
        const fallbackData = await fetchFurniture("all", "all", 400);
        return mergeAndDedupe(fallbackData.features ?? []);
      })
      .catch((error: unknown) => {
        facilitiesCatalogPromise = null;
        throw error;
      });
  }

  return facilitiesCatalogPromise;
}

export function findNearbySupportedFacilities(
  features: FurnitureFeature[],
  targetLat: number,
  targetLng: number,
  radiusMeters: number = 500,
  limit: number = 3
): NearbyFacility[] {
  return features
    .map((feature, index) => {
      const kind = classifySupportedFacility(feature.properties.asset_type);
      const coords = readCoordinates(feature);
      if (!kind || !coords) return null;

      const distance = distanceMeters(targetLat, targetLng, coords.lat, coords.lng);
      if (distance > radiusMeters) return null;

      const locationDescription = normalizeText(feature.properties.location_desc);

      return {
        id: `${kind}-${coords.lat}-${coords.lng}`,
        kind,
        name: buildFacilityName(kind, locationDescription, index),
        typeLabel: getSupportedFacilityTypeLabel(kind),
        distanceMeters: Math.round(distance),
        conditionRating: feature.properties.condition_rating,
        locationDescription,
        lat: coords.lat,
        lng: coords.lng,
      } satisfies NearbyFacility;
    })
    .filter((item): item is NearbyFacility => item !== null)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, limit);
}

export function findNearestFacilitiesByKind(
  features: FurnitureFeature[],
  targetLat: number,
  targetLng: number,
  radiusMeters: number = 500
): NearbyFacilitySlot[] {
  const allNearby = findNearbySupportedFacilities(
    features,
    targetLat,
    targetLng,
    radiusMeters,
    Number.MAX_SAFE_INTEGER
  );

  const slots = SUPPORTED_FACILITY_KINDS.map((kind) => ({
    kind,
    typeLabel: getSupportedFacilityTypeLabel(kind),
    facility: allNearby.find((item) => item.kind === kind) ?? null,
  }));

  return slots.sort((a, b) => {
    if (a.facility && b.facility) return a.facility.distanceMeters - b.facility.distanceMeters;
    if (a.facility) return -1;
    if (b.facility) return 1;
    return SUPPORTED_FACILITY_KINDS.indexOf(a.kind) - SUPPORTED_FACILITY_KINDS.indexOf(b.kind);
  });
}
