export type SupportedRegionPoint = {
  lng: number;
  lat: number;
};

export const AUSTRALIA_REGION_BOUNDS = {
  minLng: 112,
  maxLng: 154,
  minLat: -44.5,
  maxLat: -10,
} as const;

export const AUSTRALIA_REGION_MAX_BOUNDS = [
  [AUSTRALIA_REGION_BOUNDS.minLng, AUSTRALIA_REGION_BOUNDS.minLat],
  [AUSTRALIA_REGION_BOUNDS.maxLng, AUSTRALIA_REGION_BOUNDS.maxLat],
] as const;

export const AUSTRALIA_REGION_ERROR = {
  title: "Outside supported area",
  message: "Only locations inside Australia are supported for the 3D route preview.",
} as const;

export function isPointInSupportedRegion(point: SupportedRegionPoint): boolean {
  return (
    point.lng >= AUSTRALIA_REGION_BOUNDS.minLng &&
    point.lng <= AUSTRALIA_REGION_BOUNDS.maxLng &&
    point.lat >= AUSTRALIA_REGION_BOUNDS.minLat &&
    point.lat <= AUSTRALIA_REGION_BOUNDS.maxLat
  );
}
