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
      <AreaDetailPage area={area!} onBack={vi.fn()} onRecommendationClick={vi.fn()} />
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
      <AreaDetailPage area={area!} onBack={onBack} onRecommendationClick={vi.fn()} />
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
});
