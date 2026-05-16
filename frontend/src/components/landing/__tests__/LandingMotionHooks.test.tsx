import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import HeroSplitScene from "../HeroSplitScene";
import MissionGalleryScene from "../MissionGalleryScene";
import StartUsingScene from "../StartUsingScene";

vi.mock("../IconMarquee", () => ({
  default: () => <div data-testid="icon-marquee">Marquee</div>,
}));

vi.mock("../landingSceneController", () => ({
  acquire: vi.fn(() => false),
  bridgeResidualScroll: vi.fn(),
  getLockOwner: vi.fn(() => null),
  KEYBOARD_HANDOFF_DELTA_PX: 96,
  release: vi.fn(),
}));

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

describe("landing motion hooks", () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1280,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 0,
    });
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/" },
    });

    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: vi.fn(() => Promise.resolve()),
    });
    Object.defineProperty(HTMLMediaElement.prototype, "pause", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLMediaElement.prototype, "load", {
      configurable: true,
      value: vi.fn(),
    });

    vi.spyOn(HTMLElement.prototype, "offsetTop", "get").mockReturnValue(1000);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(3600);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: originalInnerHeight,
    });
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    document.body.innerHTML = "";
  });

  test("marks hero, mission, and start scenes as part of the shared landing motion family", () => {
    const view = render(
      <MemoryRouter>
        <HeroSplitScene />
        <StartUsingScene />
        <MissionGalleryScene />
      </MemoryRouter>
    );

    const motionScenes = Array.from(view.container.querySelectorAll("[data-landing-motion='signature']"));
    expect(motionScenes).toHaveLength(3);

    view.unmount();
  });
});
