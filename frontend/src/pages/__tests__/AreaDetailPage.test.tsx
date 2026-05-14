import React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import AreaDetailPage from "../AreaDetailPage";
import { getAreaInfo } from "../../lib/areaInfo";

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

describe("AreaDetailPage - Epic 3.1", () => {
  test("renders the area introduction flow with character, tags, recommendations, and comfort routes", () => {
    const area = getAreaInfo("docklands");
    expect(area).not.toBeNull();

    const view = render(
      <AreaDetailPage
        area={area!}
        onBack={vi.fn()}
        onRecommendationClick={vi.fn()}
        onComfortRouteClick={vi.fn()}
      />
    );

    expect(view.container.textContent).toContain("Area Introduction");
    expect(view.container.textContent).toContain("Area Character");
    expect(view.container.textContent).toContain("Area Tags");
    expect(view.container.textContent).toContain("Recommendation");
    expect(view.container.textContent).toContain("Comfort Routes");
    expect(view.container.textContent).toContain("Back to Interactive Map");

    view.unmount();
  });

  test("clicking the back button returns to the interactive map", () => {
    const onBack = vi.fn();
    const area = getAreaInfo("docklands");
    expect(area).not.toBeNull();

    const view = render(
      <AreaDetailPage
        area={area!}
        onBack={onBack}
        onRecommendationClick={vi.fn()}
        onComfortRouteClick={vi.fn()}
      />
    );

    const backButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Back to Interactive Map")
    );

    expect(backButton).toBeTruthy();
    act(() => {
      backButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onBack).toHaveBeenCalledTimes(1);

    view.unmount();
  });

  test("clicking a recommendation card opens the selected place detail", () => {
    const onRecommendationClick = vi.fn();
    const area = getAreaInfo("docklands");
    expect(area).not.toBeNull();

    const view = render(
      <AreaDetailPage
        area={area!}
        onBack={vi.fn()}
        onRecommendationClick={onRecommendationClick}
        onComfortRouteClick={vi.fn()}
      />
    );

    const recommendationButtons = Array.from(view.container.querySelectorAll("button")).filter(
      (button) => button.textContent?.includes("View nearby facilities")
    );

    expect(recommendationButtons.length).toBeGreaterThan(0);
    act(() => {
      recommendationButtons[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onRecommendationClick).toHaveBeenCalledWith("library-at-the-dock");

    view.unmount();
  });

  test("clicking a comfort route opens the selected route for 3D preview", () => {
    const onComfortRouteClick = vi.fn();
    const area = getAreaInfo("east-melbourne");
    expect(area).not.toBeNull();

    const view = render(
      <AreaDetailPage
        area={area!}
        onBack={vi.fn()}
        onRecommendationClick={vi.fn()}
        onComfortRouteClick={onComfortRouteClick}
      />
    );

    const routeButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Treasury Gardens → Fitzroy Gardens")
    );

    expect(routeButton).toBeTruthy();
    act(() => {
      routeButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onComfortRouteClick).toHaveBeenCalledTimes(1);
    expect(onComfortRouteClick.mock.calls[0][0]).toMatchObject({
      title: "Treasury Gardens → Fitzroy Gardens",
      autoLocateStart: false,
      start: { id: "treasury-gardens" },
      end: { id: "fitzroy-gardens" },
    });

    view.unmount();
  });
});
