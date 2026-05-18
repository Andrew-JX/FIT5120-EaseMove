import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import HeroSplitScene from "../HeroSplitScene";

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

describe("HeroSplitScene", () => {
  const originalInnerWidth = window.innerWidth;
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1280,
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    document.body.innerHTML = "";
  });

  test("renders the hero title and scroll cue interaction hooks", () => {
    const view = render(<HeroSplitScene />);

    expect(view.container.querySelector(".landing-hero-title-shell")).not.toBeNull();
    expect(view.container.querySelector(".landing-hero-title-accent")).not.toBeNull();
    expect(view.container.querySelector(".landing-hero-scroll-cue-ring")).not.toBeNull();
    expect(view.container.querySelector(".landing-hero-scroll-cue-copy")).not.toBeNull();

    view.unmount();
  });

  test("shows the loading poster before the video is ready", () => {
    const view = render(<HeroSplitScene />);

    expect(view.container.querySelector(".landing-video-placeholder")).not.toBeNull();

    const poster = view.container.querySelector(".landing-video-poster") as HTMLImageElement | null;
    expect(poster).not.toBeNull();
    expect(poster?.className).not.toContain("is-ready");

    act(() => {
      poster?.dispatchEvent(new Event("load"));
    });

    expect(view.container.querySelector(".landing-video-placeholder")).toBeNull();
    expect(poster?.className).toContain("is-ready");

    const video = view.container.querySelector(".landing-video") as HTMLVideoElement | null;
    expect(video).not.toBeNull();
    expect(video?.className).not.toContain("is-ready");

    act(() => {
      video?.dispatchEvent(new Event("canplay"));
    });

    expect(video?.className).toContain("is-ready");

    view.unmount();
  });
});
