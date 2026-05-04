import React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import RecommendationFacilitiesPage from "../RecommendationFacilitiesPage";
import { getAreaInfo, getAreaRecommendation } from "../../lib/areaInfo";

vi.mock("../../lib/streetFacilities", () => ({
  fetchSupportedFacilitiesCatalog: vi.fn(),
  findNearestFacilitiesByKind: vi.fn(),
}));

import {
  fetchSupportedFacilitiesCatalog,
  findNearestFacilitiesByKind,
} from "../../lib/streetFacilities";

function render(element: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return {
    container,
    async flush() {
      await act(async () => {
        await Promise.resolve();
      });
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

describe("RecommendationFacilitiesPage - Epic 3.2", () => {
  test("renders the three supported facility types with names and approximate distances", async () => {
    vi.mocked(fetchSupportedFacilitiesCatalog).mockResolvedValue([]);
    vi.mocked(findNearestFacilitiesByKind).mockReturnValue([
      {
        kind: "bicycle",
        typeLabel: "Bicycle Rack",
        facility: {
          id: "bike-1",
          kind: "bicycle",
          name: "Harbour Esplanade Rack",
          typeLabel: "Bicycle Rack",
          distanceMeters: 42,
          conditionRating: null,
          locationDescription: "Harbour Esplanade Rack",
          lat: -37.814,
          lng: 144.947,
        },
      },
      {
        kind: "drinking",
        typeLabel: "Drinking Fountain",
        facility: {
          id: "drink-1",
          kind: "drinking",
          name: "Waterfront Fountain",
          typeLabel: "Drinking Fountain",
          distanceMeters: 96,
          conditionRating: null,
          locationDescription: "Waterfront Fountain",
          lat: -37.814,
          lng: 144.947,
        },
      },
      {
        kind: "seat",
        typeLabel: "Public Seating",
        facility: {
          id: "seat-1",
          kind: "seat",
          name: "Promenade Bench",
          typeLabel: "Public Seating",
          distanceMeters: 140,
          conditionRating: null,
          locationDescription: "Promenade Bench",
          lat: -37.814,
          lng: 144.947,
        },
      },
    ]);

    const area = getAreaInfo("docklands");
    const recommendation = getAreaRecommendation("docklands", "library-at-the-dock");
    expect(area).not.toBeNull();
    expect(recommendation).not.toBeNull();

    const view = render(
      <RecommendationFacilitiesPage
        area={area!}
        recommendation={recommendation!}
        onBack={vi.fn()}
      />
    );

    await view.flush();

    expect(view.container.textContent).toContain("Nearby Public Facilities");
    expect(view.container.textContent).toContain("Harbour Esplanade Rack");
    expect(view.container.textContent).toContain("Waterfront Fountain");
    expect(view.container.textContent).toContain("Promenade Bench");
    expect(view.container.textContent).toContain("42m");
    expect(view.container.textContent).toContain("96m");
    expect(view.container.textContent).toContain("140m");

    view.unmount();
  });

  test("shows a clear empty-state message when a supported facility type has no nearby match", async () => {
    vi.mocked(fetchSupportedFacilitiesCatalog).mockResolvedValue([]);
    vi.mocked(findNearestFacilitiesByKind).mockReturnValue([
      {
        kind: "bicycle",
        typeLabel: "Bicycle Rack",
        facility: null,
      },
      {
        kind: "drinking",
        typeLabel: "Drinking Fountain",
        facility: null,
      },
      {
        kind: "seat",
        typeLabel: "Public Seating",
        facility: null,
      },
    ]);

    const area = getAreaInfo("docklands");
    const recommendation = getAreaRecommendation("docklands", "library-at-the-dock");
    expect(area).not.toBeNull();
    expect(recommendation).not.toBeNull();

    const view = render(
      <RecommendationFacilitiesPage
        area={area!}
        recommendation={recommendation!}
        onBack={vi.fn()}
      />
    );

    await view.flush();

    expect(view.container.textContent).toContain("No bicycle rack nearby");
    expect(view.container.textContent).toContain("No drinking fountain nearby");
    expect(view.container.textContent).toContain("No public seating nearby");
    expect(view.container.textContent).toContain("within 500m");

    view.unmount();
  });

  test("clicking the page back button returns to the area introduction page", async () => {
    const onBack = vi.fn();
    vi.mocked(fetchSupportedFacilitiesCatalog).mockResolvedValue([]);
    vi.mocked(findNearestFacilitiesByKind).mockReturnValue([]);

    const area = getAreaInfo("docklands");
    const recommendation = getAreaRecommendation("docklands", "library-at-the-dock");
    expect(area).not.toBeNull();
    expect(recommendation).not.toBeNull();

    const view = render(
      <RecommendationFacilitiesPage area={area!} recommendation={recommendation!} onBack={onBack} />
    );

    await view.flush();

    const backButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Back to Docklands")
    );

    expect(backButton).toBeTruthy();
    act(() => {
      backButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onBack).toHaveBeenCalledTimes(1);

    view.unmount();
  });
});
