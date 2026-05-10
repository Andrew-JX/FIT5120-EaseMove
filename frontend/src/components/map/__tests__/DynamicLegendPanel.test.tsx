import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test } from "vitest";

import DynamicLegendPanel from "../DynamicLegendPanel";

function render(element: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return {
    container,
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("DynamicLegendPanel", () => {
  test("renders the Food & Dining legend row when Ease Places are enabled", () => {
    const view = render(
      <DynamicLegendPanel
        filters={{
          easePlaces: true,
          comfortArea: false,
          streetFacilities: false,
          naturalPlaces: false,
        }}
      />
    );

    expect(view.container.textContent).toContain("Food & Dining");

    view.unmount();
  });

  test("uses a scrollable legend body when many legend sections are visible", () => {
    const view = render(
      <DynamicLegendPanel
        filters={{
          easePlaces: true,
          comfortArea: true,
          streetFacilities: true,
          naturalPlaces: true,
        }}
      />
    );

    const legendBody = view.container.querySelector('[data-testid="dynamic-legend-body"]');
    expect(legendBody).toBeTruthy();
    expect(legendBody?.className).toContain("legend-body-scrollable");

    view.unmount();
  });
});
