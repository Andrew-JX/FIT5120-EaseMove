import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import HomePage from "../HomePage";
import { resetLandingSpiderCatGuideRuntimeState } from "../LandingSpiderCatGuide";

vi.mock("../../AppTopNav", () => ({
  default: () => <div data-testid="landing-nav-probe" />,
}));

vi.mock("../../FloatingBackToTop", () => ({
  default: () => <div data-testid="back-to-top-probe" />,
}));

vi.mock("../HeroSplitScene", () => ({
  default: () => <section>Hero</section>,
}));

vi.mock("../HowToUseScene", () => ({
  default: ({
    spiderJourneyAnchorRef,
  }: {
    spiderJourneyAnchorRef?: React.RefObject<HTMLDivElement | null>;
  }) => (
    <section id="landing-next-section">
      <div ref={spiderJourneyAnchorRef} data-testid="how-anchor">
        How
      </div>
    </section>
  ),
}));

vi.mock("../StartUsingScene", () => ({
  default: ({
    spiderJourneyAnchorRef,
  }: {
    spiderJourneyAnchorRef?: React.RefObject<HTMLDivElement | null>;
  }) => (
    <section className="landing-start-scene">
      <div ref={spiderJourneyAnchorRef} data-testid="start-anchor">
        Start
      </div>
    </section>
  ),
}));

vi.mock("../MissionGalleryScene", () => ({
  default: () => <section>Mission</section>,
}));

vi.mock("../FooterScene", () => ({
  default: () => <footer className="landing-footer-scene">Footer</footer>,
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

describe("HomePage spider cat journey", () => {
  const originalMatchMedia = window.matchMedia;
  const originalScrollTo = window.scrollTo;

  beforeEach(() => {
    resetLandingSpiderCatGuideRuntimeState();
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 0,
    });
    window.matchMedia = vi.fn((query: string) => ({
      matches: query === "(pointer: fine)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as typeof window.matchMedia;
    window.scrollTo = vi.fn();

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
      if ((this as HTMLElement).dataset.testid === "how-anchor") {
        return {
          x: 0,
          y: 180,
          width: 320,
          height: 130,
          top: 180,
          right: 320,
          bottom: 310,
          left: 0,
          toJSON: () => ({}),
        } as DOMRect;
      }

      if ((this as HTMLElement).dataset.testid === "start-anchor") {
        return {
          x: 0,
          y: 980,
          width: 420,
          height: 180,
          top: 980,
          right: 420,
          bottom: 1160,
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
    resetLandingSpiderCatGuideRuntimeState();
    vi.restoreAllMocks();
    window.matchMedia = originalMatchMedia;
    window.scrollTo = originalScrollTo;
    document.body.innerHTML = "";
  });

  test("renders one shared spider cat across the how-to and start sections and can hide it", () => {
    const view = render(
      <MemoryRouter initialEntries={["/"]}>
        <HomePage />
      </MemoryRouter>
    );

    expect(view.container.querySelectorAll('[data-testid="landing-spider-cat-journey"]')).toHaveLength(1);
    expect(view.container.querySelector('[data-testid="landing-spider-cat"]')).toBeNull();
    expect(view.container.querySelector('[data-testid="landing-spider-cat-how"]')).toBeNull();

    const spiderCat = view.container.querySelector('[data-testid="landing-spider-cat-journey"]') as HTMLElement | null;
    expect(spiderCat).not.toBeNull();

    act(() => {
      spiderCat?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });

    expect(view.container.querySelector('[data-testid="landing-spider-cat-journey-tip"]')?.textContent).toContain(
      "Map first?"
    );

    const hideButton = view.container.querySelector('[data-testid="landing-spider-cat-journey-hide"]') as HTMLButtonElement | null;
    expect(hideButton).not.toBeNull();

    act(() => {
      hideButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.querySelector('[data-testid="landing-spider-cat-journey"]')).toBeNull();

    view.unmount();
  });
});
