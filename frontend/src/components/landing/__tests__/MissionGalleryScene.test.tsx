import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import MissionGalleryScene from "../MissionGalleryScene";

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

describe("MissionGalleryScene", () => {
  const originalInnerHeight = window.innerHeight;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;

  beforeEach(() => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 0,
    });
    window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    window.cancelAnimationFrame = vi.fn();

    vi.spyOn(HTMLElement.prototype, "offsetTop", "get").mockReturnValue(1000);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(3600);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: originalInnerHeight,
    });
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    document.body.innerHTML = "";
  });

  test("exposes scene state and renders the ambient mission aperture while active", () => {
    const view = render(<MissionGalleryScene />);

    const scene = view.container.querySelector(".landing-mission-scene");
    expect(scene?.getAttribute("data-scene-state")).toBe("before");

    act(() => {
      window.scrollY = 1600;
      window.dispatchEvent(new Event("scroll"));
    });

    expect(scene?.getAttribute("data-scene-state")).toBe("active");
    expect(view.container.querySelector(".landing-mission-aperture")).not.toBeNull();

    view.unmount();
  });

  test("keeps the original gallery card image source", () => {
    const view = render(<MissionGalleryScene />);

    act(() => {
      window.scrollY = 1600;
      window.dispatchEvent(new Event("scroll"));
    });

    const firstCard = view.container.querySelector(
      ".landing-mission-gallery-card img"
    ) as HTMLImageElement | null;

    expect(firstCard).not.toBeNull();
    expect(firstCard?.getAttribute("src")).toContain("1.png");
    expect(firstCard?.getAttribute("srcset")).toBeNull();

    view.unmount();
  });
});
