import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import AboutUsPage from "../AboutUsPage";

type CapturedNavProps = Record<string, unknown>;
type MatchMediaListener = (event: MediaQueryListEvent) => void;

const capturedNavProps: CapturedNavProps[] = [];

let mobileViewport = false;
const mobileListeners = new Set<MatchMediaListener>();

vi.mock("canvas-confetti", () => ({
  default: {
    create: vi.fn(() => vi.fn()),
  },
}));

vi.mock("animejs", () => ({
  animate: vi.fn(),
  createScope: vi.fn(() => {
    const scope = {
      add: (callback: () => void) => {
        callback();
        return scope;
      },
      revert: vi.fn(),
    };
    return scope;
  }),
  createTimeline: vi.fn(() => ({
    add: vi.fn().mockReturnThis(),
  })),
  stagger: vi.fn(() => 0),
}));

vi.mock("gsap", () => ({
  default: {
    registerPlugin: vi.fn(),
    context: vi.fn((callback: () => void) => {
      callback();
      return { revert: vi.fn() };
    }),
    set: vi.fn(),
    to: vi.fn(),
    fromTo: vi.fn(),
    utils: {
      toArray: vi.fn(() => []),
    },
  },
}));

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: {
    getAll: vi.fn(() => []),
  },
}));

vi.mock("../../components/AppTopNav", () => ({
  default: (props: CapturedNavProps) => {
    capturedNavProps.push(props);
    return <div data-testid="about-nav-probe" />;
  },
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

describe("AboutUsPage nav state", () => {
  const originalMatchMedia = window.matchMedia;
  const originalScrollTo = window.scrollTo;

  beforeEach(() => {
    capturedNavProps.length = 0;
    mobileViewport = false;
    mobileListeners.clear();
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 0,
    });
    window.scrollTo = vi.fn();
    window.matchMedia = vi.fn((query: string) => ({
      matches: query === "(max-width: 720px)" ? mobileViewport : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn((event: string, listener: MatchMediaListener) => {
        if (query === "(max-width: 720px)" && event === "change") {
          mobileListeners.add(listener);
        }
      }),
      removeEventListener: vi.fn((event: string, listener: MatchMediaListener) => {
        if (query === "(max-width: 720px)" && event === "change") {
          mobileListeners.delete(listener);
        }
      }),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as typeof window.matchMedia;

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
      if ((this as HTMLElement).classList.contains("aboutus-hero")) {
        return {
          x: 0,
          y: -window.scrollY,
          width: 1200,
          height: 860,
          top: -window.scrollY,
          right: 1200,
          bottom: 860 - window.scrollY,
          left: 0,
          toJSON: () => ({}),
        } as DOMRect;
      }

      if ((this as HTMLElement).classList.contains("aboutus-evidence")) {
        return {
          x: 0,
          y: 2100 - window.scrollY,
          width: 1200,
          height: 700,
          top: 2100 - window.scrollY,
          right: 1200,
          bottom: 2800 - window.scrollY,
          left: 0,
          toJSON: () => ({}),
        } as DOMRect;
      }

      return {
        x: 0,
        y: 0,
        width: 1200,
        height: 200,
        top: 0,
        right: 1200,
        bottom: 200,
        left: 0,
        toJSON: () => ({}),
      } as DOMRect;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.matchMedia = originalMatchMedia;
    window.scrollTo = originalScrollTo;
    document.body.innerHTML = "";
  });

  test("starts expanded on desktop and collapses while scrolling down", () => {
    const view = render(
      <MemoryRouter initialEntries={["/aboutus"]}>
        <Routes>
          <Route path="/aboutus" element={<AboutUsPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(capturedNavProps.at(-1)).toMatchObject({
      variant: "landing",
      landingMode: "hero",
      landingTransitionProgress: 0,
      landingTone: "light",
    });

    const backToTopButton = view.container.querySelector('[data-testid="floating-back-to-top"]') as HTMLButtonElement | null;
    expect(backToTopButton).not.toBeNull();
    expect(backToTopButton?.style.opacity).toBe("0");

    act(() => {
      window.scrollY = 70;
      window.dispatchEvent(new Event("scroll"));
    });

    expect(capturedNavProps.at(-1)).toMatchObject({
      landingMode: "transition",
      landingTone: "light",
    });
    expect((capturedNavProps.at(-1)?.landingTransitionProgress as number) > 0).toBe(true);
    expect((capturedNavProps.at(-1)?.landingTransitionProgress as number) < 1).toBe(true);
    expect(Number(backToTopButton?.style.opacity ?? 0)).toBeGreaterThan(0);

    act(() => {
      window.scrollY = 180;
      window.dispatchEvent(new Event("scroll"));
    });

    expect(capturedNavProps.at(-1)).toMatchObject({
      landingMode: "compact",
      landingTransitionProgress: 1,
      landingTone: "light",
    });
    expect(backToTopButton?.style.opacity).toBe("1");

    act(() => {
      window.scrollY = 960;
      window.dispatchEvent(new Event("scroll"));
    });

    expect(capturedNavProps.at(-1)).toMatchObject({
      landingTone: "dark",
    });

    view.unmount();
  });

  test("stays compact on mobile from the start", () => {
    mobileViewport = true;

    const view = render(
      <MemoryRouter initialEntries={["/aboutus"]}>
        <Routes>
          <Route path="/aboutus" element={<AboutUsPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(capturedNavProps.at(-1)).toMatchObject({
      variant: "landing",
      landingMode: "compact",
      landingTransitionProgress: 1,
    });

    view.unmount();
  });
});
