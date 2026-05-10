import { describe, expect, test } from "vitest";

import { EASE_PLACES_DATA, easePlacesMarkerColor } from "../easePlaces";

describe("easePlaces data - Epic 5 enhancements", () => {
  test("includes Melbourne City food recommendations in the shared Ease Places dataset", () => {
    const foodPlaces = EASE_PLACES_DATA.filter((feature) => feature.category === "Food & Dining");

    expect(foodPlaces.length).toBeGreaterThanOrEqual(12);
    expect(foodPlaces.map((feature) => feature.name)).toEqual(
      expect.arrayContaining([
        "Gimlet at Cavendish House",
        "Grill Americano",
        "MoVida",
        "Embla",
        "Cumulus Inc",
        "Supernormal",
        "Chin Chin",
        "Hazel",
        "Florentino",
        "Tipo 00",
        "Tonka",
      ])
    );
  });

  test("returns the orange marker palette for Food & Dining places", () => {
    expect(easePlacesMarkerColor("Food & Dining")).toEqual({
      core: "#dd6b20",
      halo: "rgba(221,107,32,0.22)",
    });
  });
});
