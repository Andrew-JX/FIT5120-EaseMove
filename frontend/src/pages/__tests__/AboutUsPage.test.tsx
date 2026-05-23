import React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import AboutUsPage from "../AboutUsPage";

vi.mock("canvas-confetti", () => ({
  default: {
    create: vi.fn(() => vi.fn()),
  },
}));

const originalInnerHeight = window.innerHeight;

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

function pageText(container: HTMLElement) {
  return container.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

afterEach(() => {
  document.body.innerHTML = "";
  Object.defineProperty(window, "innerHeight", {
    writable: true,
    configurable: true,
    value: originalInnerHeight,
  });
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("scrollTo", vi.fn());
  Object.defineProperty(window, "innerHeight", {
    writable: true,
    configurable: true,
    value: 900,
  });
});

describe("AboutUsPage", () => {
  test("renders the about page hero, project story, and archive entry point", () => {
    const view = render(
      <MemoryRouter initialEntries={["/aboutus"]}>
        <Routes>
          <Route path="/aboutus" element={<AboutUsPage />} />
          <Route path="/" element={<div>Home page</div>} />
          <Route path="/map" element={<div>Map page</div>} />
        </Routes>
      </MemoryRouter>
    );

    const text = pageText(view.container);
    const heroCard = view.container.querySelector('[data-testid="aboutus-hero-card"]');
    const removedHeroRoutePanel = view.container.querySelector(".aboutus-hero-route-panel");
    const removedHeroChips = view.container.querySelector(".aboutus-floating-chip");

    expect(heroCard).not.toBeNull();
    expect(text).toContain("See urban comfort before the street asks you to react.");
    expect(text).toContain("MoveComfortly helps walkers, cyclists, students, and young workers");
    expect(text).toContain("Route comfort, local support, and weather context in one planning layer.");
    expect(text).toContain("City-scale awareness");
    expect(text).toContain("Route rehearsal");
    expect(text).toContain("Project archive");
    expect(text).toContain("Open Monash ePortfolio");
    expect(text).toContain("Open 3D route");
    expect(text).toContain("Confidence preview");
    expect(text).toContain("Departure timing");
    expect(removedHeroChips).toBeNull();
    expect(removedHeroRoutePanel).toBeNull();
    expect(text).not.toContain("static project summary");

    view.unmount();
  });

  test("surfaces product capabilities and evidence framing", () => {
    const view = render(
      <MemoryRouter initialEntries={["/aboutus"]}>
        <Routes>
          <Route path="/aboutus" element={<AboutUsPage />} />
        </Routes>
      </MemoryRouter>
    );

    const text = pageText(view.container);
    const modulesCarousel = view.container.querySelector('[data-testid="aboutus-modules-carousel"]');
    const moduleCards = view.container.querySelectorAll('[data-testid="aboutus-module-card"]');

    expect(text).toContain("Route atmosphere");
    expect(text).toContain("Map intelligence");
    expect(text).toContain("3D route preview");
    expect(text).toContain("Risk guidance");
    expect(text).toContain("Support-place context");
    expect(text).toContain("Journey timing");
    expect(text).toContain("Drag left or right, or select a side card to bring it forward.");
    expect(modulesCarousel).not.toBeNull();
    expect(moduleCards).toHaveLength(6);
    expect(text).not.toContain("Drag sideways to explore all six layers");
    expect(text).not.toContain("Left");
    expect(text).not.toContain("Right");
    expect(text).toContain("Public data context");
    expect(text).toContain("Comparative guidance");
    expect(text).toContain("Educational framing");
    expect(text).not.toContain("The motion is theatrical");

    view.unmount();
  });

  test("clicking a side carousel card brings it to the front", () => {
    const view = render(
      <MemoryRouter initialEntries={["/aboutus"]}>
        <Routes>
          <Route path="/aboutus" element={<AboutUsPage />} />
        </Routes>
      </MemoryRouter>
    );

    const cards = Array.from(view.container.querySelectorAll('[data-testid="aboutus-module-card"]')) as HTMLElement[];

    expect(cards).toHaveLength(6);
    expect(cards[0]?.dataset.front).toBe("true");
    expect(cards[1]?.dataset.front).not.toBe("true");

    act(() => {
      cards[1]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(cards[1]?.dataset.front).toBe("true");
    expect(cards[0]?.dataset.front).not.toBe("true");

    view.unmount();
  });

  test("back returns to the previous page when history exists", () => {
    const view = render(
      <MemoryRouter initialEntries={["/map", "/aboutus"]} initialIndex={1}>
        <Routes>
          <Route path="/aboutus" element={<AboutUsPage />} />
          <Route path="/map" element={<div>Map page</div>} />
        </Routes>
      </MemoryRouter>
    );

    const button = view.container.querySelector(".aboutus-back-button") as HTMLButtonElement | null;

    expect(button).toBeTruthy();

    act(() => {
      button!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(pageText(view.container)).toContain("Map page");

    view.unmount();
  });

  test("back falls back to the landing page when there is no previous history entry", () => {
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    const view = render(
      <MemoryRouter initialEntries={["/aboutus"]}>
        <Routes>
          <Route path="/aboutus" element={<AboutUsPage />} />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </MemoryRouter>
    );

    replaceStateSpy.mockImplementation((data, unused, url) => {
      return History.prototype.replaceState.call(window.history, { ...(data as object), idx: 0 }, unused, url);
    });
    window.history.replaceState({ idx: 0 }, "", "/aboutus");

    const button = view.container.querySelector(".aboutus-back-button") as HTMLButtonElement | null;

    expect(button).toBeTruthy();

    act(() => {
      button!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(pageText(view.container)).toContain("Home page");

    view.unmount();
  });

  test("back falls back to the landing page when browser history has no router idx metadata", () => {
    window.history.replaceState(null, "", "/aboutus");

    const view = render(
      <BrowserRouter>
        <Routes>
          <Route path="/aboutus" element={<AboutUsPage />} />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </BrowserRouter>
    );

    const button = view.container.querySelector(".aboutus-back-button") as HTMLButtonElement | null;

    expect(button).toBeTruthy();

    act(() => {
      button!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(pageText(view.container)).toContain("Home page");

    view.unmount();
  });

  test("keeps the back button above the landing navigation hero layer", () => {
    const cssPath = path.resolve(import.meta.dirname, "../aboutus.css");
    const css = readFileSync(cssPath, "utf8");
    const backButtonRule = css.match(/\.aboutus-back-button\s*\{\s*position:\s*absolute;[\s\S]*?z-index:\s*(\d+);/);

    expect(backButtonRule).not.toBeNull();
    expect(Number(backButtonRule?.[1] ?? 0)).toBeGreaterThan(150);
  });

  test("hero signal cards render immediately inside the merged hero card", () => {
    const cssPath = path.resolve(import.meta.dirname, "../aboutus.css");
    const css = readFileSync(cssPath, "utf8");
    const signalCardRule = css.match(/\.aboutus-signal-card\s*\{[\s\S]*?opacity:\s*(\d+(?:\.\d+)?);/);

    expect(signalCardRule).not.toBeNull();
    expect(Number(signalCardRule?.[1] ?? 0)).toBe(1);
  });

  test("about page motion keeps back button staged and reveal panels timely", () => {
    const sourcePath = path.resolve(import.meta.dirname, "../AboutUsPage.tsx");
    const source = readFileSync(sourcePath, "utf8");

    expect(source).toContain('const heroBackButton = root.querySelector(".aboutus-back-button")');
    expect(source).toContain('start: "top 90%"');
  });

  test("plays the about-us ending easter egg only after staying at the bottom for two seconds", () => {
    const view = render(
      <MemoryRouter initialEntries={["/aboutus"]}>
        <Routes>
          <Route path="/aboutus" element={<AboutUsPage />} />
        </Routes>
      </MemoryRouter>
    );

    const trigger = view.container.querySelector('[data-testid="aboutus-easter-egg-trigger"]') as HTMLElement | null;
    expect(trigger).toBeTruthy();

    let triggerTop = 1400;
    trigger!.getBoundingClientRect = vi.fn(() => ({
      x: 0,
      y: triggerTop,
      top: triggerTop,
      bottom: triggerTop + 20,
      left: 0,
      right: 20,
      width: 20,
      height: 20,
      toJSON: () => ({}),
    }));

    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(view.container.querySelector('[data-testid="aboutus-ending-easter-egg"]')).toBeNull();

    triggerTop = 876;
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    act(() => {
      vi.advanceTimersByTime(1900);
    });

    expect(view.container.querySelector('[data-testid="aboutus-ending-easter-egg"]')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(view.container.querySelector('[data-testid="aboutus-ending-easter-egg"]')).not.toBeNull();
    expect(pageText(view.container)).toContain("You made it all the way.");

    act(() => {
      window.dispatchEvent(new Event("scroll"));
      vi.advanceTimersByTime(3200);
    });

    expect(view.container.querySelector('[data-testid="aboutus-ending-easter-egg"]')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(view.container.querySelector('[data-testid="aboutus-ending-easter-egg"]')).toBeNull();

    act(() => {
      window.dispatchEvent(new Event("scroll"));
      vi.advanceTimersByTime(2200);
    });

    expect(view.container.querySelector('[data-testid="aboutus-ending-easter-egg"]')).toBeNull();

    view.unmount();
  });

  test("re-entering the about page allows the ending easter egg to trigger again", () => {
    const mountAndTrigger = () => {
      const view = render(
        <MemoryRouter initialEntries={["/aboutus"]}>
          <Routes>
            <Route path="/aboutus" element={<AboutUsPage />} />
          </Routes>
        </MemoryRouter>
      );

      const trigger = view.container.querySelector('[data-testid="aboutus-easter-egg-trigger"]') as HTMLElement | null;
      expect(trigger).toBeTruthy();

      let triggerTop = 876;
      trigger!.getBoundingClientRect = vi.fn(() => ({
        x: 0,
        y: triggerTop,
        top: triggerTop,
        bottom: triggerTop + 20,
        left: 0,
        right: 20,
        width: 20,
        height: 20,
        toJSON: () => ({}),
      }));

      act(() => {
        window.dispatchEvent(new Event("scroll"));
        vi.advanceTimersByTime(2200);
      });

      expect(view.container.querySelector('[data-testid="aboutus-ending-easter-egg"]')).not.toBeNull();
      return view;
    };

    const firstView = mountAndTrigger();
    firstView.unmount();

    const secondView = mountAndTrigger();
    secondView.unmount();
  });
});
