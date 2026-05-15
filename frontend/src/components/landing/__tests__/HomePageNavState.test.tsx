import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import HomePage from "../HomePage";

type CapturedNavProps = Record<string, unknown>;

const capturedNavProps: CapturedNavProps[] = [];

vi.mock("../../AppTopNav", () => ({
  default: (props: CapturedNavProps) => {
    capturedNavProps.push(props);
    return <div data-testid="landing-nav-probe" />;
  },
}));

vi.mock("../HeroSplitScene", () => ({
  default: () => <section data-testid="hero-scene">Hero</section>,
}));

vi.mock("../HowToUseScene", () => ({
  default: () => <section id="landing-next-section">How</section>,
}));

vi.mock("../StartUsingScene", () => ({
  default: () => <section>Start</section>,
}));

vi.mock("../MissionGalleryScene", () => ({
  default: () => <section>Mission</section>,
}));

vi.mock("../FooterScene", () => ({
  default: () => <footer>Footer</footer>,
}));

vi.mock("../landingSceneController", () => ({
  resetLandingSceneController: vi.fn(),
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

describe("HomePage landing nav state", () => {
  const originalScrollTo = window.scrollTo;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    capturedNavProps.length = 0;
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 0,
    });
    window.scrollTo = vi.fn();

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
      if ((this as HTMLElement).id === "landing-next-section") {
        return {
          x: 0,
          y: 1200 - window.scrollY,
          width: 800,
          height: 600,
          top: 1200 - window.scrollY,
          right: 800,
          bottom: 1800 - window.scrollY,
          left: 0,
          toJSON: () => ({}),
        } as DOMRect;
      }

      return {
        x: 0,
        y: 0,
        width: 800,
        height: 200,
        top: 0,
        right: 800,
        bottom: 200,
        left: 0,
        toJSON: () => ({}),
      } as DOMRect;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.scrollTo = originalScrollTo;
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: originalInnerHeight,
    });
    document.body.innerHTML = "";
  });

  test("starts in hero mode and changes to transition then compact while scrolling into the next section", () => {
    const view = render(
      <MemoryRouter initialEntries={["/"]}>
        <HomePage />
      </MemoryRouter>
    );

    expect(capturedNavProps.at(-1)).toMatchObject({
      variant: "landing",
      landingMode: "hero",
      landingTransitionProgress: 0,
    });

    act(() => {
      window.scrollY = 420;
      window.dispatchEvent(new Event("scroll"));
    });

    expect(capturedNavProps.at(-1)).toMatchObject({
      landingMode: "transition",
    });
    expect((capturedNavProps.at(-1)?.landingTransitionProgress as number) > 0).toBe(true);
    expect((capturedNavProps.at(-1)?.landingTransitionProgress as number) < 1).toBe(true);

    act(() => {
      window.scrollY = 760;
      window.dispatchEvent(new Event("scroll"));
    });

    expect(capturedNavProps.at(-1)).toMatchObject({
      landingMode: "compact",
      landingTransitionProgress: 1,
    });

    view.unmount();
  });

  test("keeps the landing scroll position without fixing the body while opening and closing the overlay", () => {
    const view = render(
      <MemoryRouter initialEntries={["/"]}>
        <HomePage />
      </MemoryRouter>
    );

    act(() => {
      window.scrollY = 760;
      (capturedNavProps.at(-1)?.onLandingOverlayOpenChange as (open: boolean) => void)(true);
    });

    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.overflow).toBe("");
    expect(document.body.style.position).toBe("");
    expect(document.body.dataset.landingLockedScrollY).toBe("760");

    act(() => {
      window.scrollY = 0;
      (capturedNavProps.at(-1)?.onLandingOverlayOpenChange as (open: boolean) => void)(false);
    });

    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 760, left: 0, behavior: "auto" });
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.overflow).toBe("");

    view.unmount();
  });
});
