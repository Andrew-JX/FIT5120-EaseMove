import { describe, expect, test } from "vitest";
import type { FurnitureFeature } from "../api";
import {
  classifySupportedFacility,
  distanceMeters,
  findNearbySupportedFacilities,
  findNearestFacilitiesByKind,
} from "../streetFacilities";

function makeFeature(
  assetType: string,
  lat: number,
  lng: number,
  locationDesc: string,
  conditionRating: number | string | null = null
): FurnitureFeature {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [lng, lat],
    },
    properties: {
      asset_type: assetType,
      location_desc: locationDesc,
      condition_rating: conditionRating,
    },
  };
}

describe("streetFacilities classification - Epic 3.2", () => {
  test("classifies bicycle, drinking, and seat facilities", () => {
    expect(classifySupportedFacility("Bicycle Rails")).toBe("bicycle");
    expect(classifySupportedFacility("Drinking Fountain")).toBe("drinking");
    expect(classifySupportedFacility("Seat")).toBe("seat");
  });

  test("returns null for unsupported facility types", () => {
    expect(classifySupportedFacility("Toilet")).toBeNull();
  });
});

describe("findNearbySupportedFacilities - Epic 3.2", () => {
  const origin = { lat: -37.8136, lng: 144.9631 };

  test("filters to supported facilities within radius and sorts nearest-first", () => {
    const features: FurnitureFeature[] = [
      makeFeature("Bicycle Rails", -37.81361, 144.96311, "Near bike rack"),
      makeFeature("Drinking Fountain", -37.8142, 144.9638, "Farther fountain"),
      makeFeature("Seat", -37.8138, 144.9633, "Mid seat"),
      makeFeature("Toilet", -37.81362, 144.96312, "Unsupported"),
      makeFeature("Seat", -37.8300, 144.9800, "Outside radius"),
    ];

    const results = findNearbySupportedFacilities(features, origin.lat, origin.lng, 500, 10);

    expect(results).toHaveLength(3);
    expect(results.map((item) => item.kind)).toEqual(["bicycle", "seat", "drinking"]);
    expect(results[0].distanceMeters).toBeLessThanOrEqual(results[1].distanceMeters);
    expect(results[1].distanceMeters).toBeLessThanOrEqual(results[2].distanceMeters);
  });

  test("uses a fallback generated name when location description is empty", () => {
    const features: FurnitureFeature[] = [makeFeature("Seat", -37.81361, 144.96311, "   ")];

    const results = findNearbySupportedFacilities(features, origin.lat, origin.lng, 500, 10);

    expect(results[0].name).toBe("Public Seating 1");
  });

  test("rounds calculated distances to whole metres", () => {
    const features: FurnitureFeature[] = [
      makeFeature("Drinking Fountain", -37.8137, 144.9632, "Rounded fountain"),
    ];

    const results = findNearbySupportedFacilities(features, origin.lat, origin.lng, 500, 10);

    expect(Number.isInteger(results[0].distanceMeters)).toBe(true);
  });
});

describe("findNearestFacilitiesByKind - Epic 3.2", () => {
  const origin = { lat: -37.8136, lng: 144.9631 };

  test("returns the nearest facility for each supported type and orders populated slots by distance", () => {
    const features: FurnitureFeature[] = [
      makeFeature("Bicycle Rails", -37.81361, 144.96311, "Nearest bike rack"),
      makeFeature("Bicycle Rails", -37.8142, 144.9639, "Far bike rack"),
      makeFeature("Drinking Fountain", -37.81375, 144.96325, "Nearest fountain"),
      makeFeature("Seat", -37.8139, 144.9634, "Nearest seat"),
      makeFeature("Seat", -37.8145, 144.9642, "Far seat"),
    ];

    const slots = findNearestFacilitiesByKind(features, origin.lat, origin.lng, 500);

    expect(slots).toHaveLength(3);
    expect(slots.every((slot) => slot.facility !== null)).toBe(true);
    expect(slots.find((slot) => slot.kind === "bicycle")?.facility?.name).toBe("Nearest bike rack");
    expect(slots.find((slot) => slot.kind === "drinking")?.facility?.name).toBe("Nearest fountain");
    expect(slots.find((slot) => slot.kind === "seat")?.facility?.name).toBe("Nearest seat");

    const populatedDistances = slots.map((slot) => slot.facility?.distanceMeters ?? Number.MAX_SAFE_INTEGER);
    expect(populatedDistances[0]).toBeLessThanOrEqual(populatedDistances[1]);
    expect(populatedDistances[1]).toBeLessThanOrEqual(populatedDistances[2]);
  });

  test("returns null slots when a supported facility type has no match within 500m", () => {
    const features: FurnitureFeature[] = [
      makeFeature("Bicycle Rails", -37.81361, 144.96311, "Nearest bike rack"),
    ];

    const slots = findNearestFacilitiesByKind(features, origin.lat, origin.lng, 500);

    expect(slots.find((slot) => slot.kind === "bicycle")?.facility?.name).toBe("Nearest bike rack");
    expect(slots.find((slot) => slot.kind === "drinking")?.facility).toBeNull();
    expect(slots.find((slot) => slot.kind === "seat")?.facility).toBeNull();
  });
});

describe("distanceMeters", () => {
  test("returns zero for identical coordinates", () => {
    expect(distanceMeters(-37.8136, 144.9631, -37.8136, 144.9631)).toBe(0);
  });
});
