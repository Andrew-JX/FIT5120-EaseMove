import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, describe, expect, test, vi } from "vitest";
import AppTopNav from "../AppTopNav";

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

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-probe">{location.pathname}</output>;
}

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("AppTopNav landing overlay", () => {
  test("renders only the compact trigger in compact mode and opens the landing overlay", () => {
    const view = render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <AppTopNav
                  variant="landing"
                  landingMode="compact"
                  landingTransitionProgress={1}
                />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(view.container.querySelector(".app-top-nav__compact-trigger")).not.toBeNull();
    expect(view.container.querySelector(".app-top-nav__links")).toBeNull();

    const openButton = view.container.querySelector(
      ".app-top-nav__compact-trigger"
    ) as HTMLButtonElement | null;
    expect(openButton?.textContent).toContain("Menu");

    act(() => {
      openButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.querySelector(".app-top-nav__landing-overlay")).not.toBeNull();
    expect(openButton?.textContent).toContain("Close");
    expect(view.container.querySelectorAll(".app-top-nav__landing-overlay-link-mask")).toHaveLength(5);
    expect(view.container.textContent).toContain("Open route");
    expect(view.container.textContent).toContain("Route rehearsal");
    expect(view.container.textContent).toContain("Open map");
    expect(view.container.textContent).toContain("Comfort planning");

    view.unmount();
  });

  test("treats Landing Page as a close-only action and navigates to route targets from overlay actions", () => {
    vi.useFakeTimers();

    const view = render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <AppTopNav
                  variant="landing"
                  landingMode="compact"
                  landingTransitionProgress={1}
                />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    const openOverlay = () => {
      const button = view.container.querySelector(".app-top-nav__compact-trigger");
      act(() => {
        button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
    };

    openOverlay();

    const landingPageAction = Array.from(
      view.container.querySelectorAll("button, a")
    ).find((element) => element.textContent?.includes("Landing Page"));

    act(() => {
      landingPageAction?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.querySelector(".app-top-nav__landing-overlay")?.className).toContain(
      "is-closing"
    );
    expect(view.container.querySelector("[data-testid='location-probe']")?.textContent).toBe("/");

    act(() => {
      vi.advanceTimersByTime(900);
    });

    openOverlay();

    const goAction = Array.from(view.container.querySelectorAll("button, a")).find(
      (element) => element.textContent?.includes("Open route")
    );

    act(() => {
      goAction?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.querySelector("[data-testid='location-probe']")?.textContent).toBe(
      "/map/3d-route"
    );

    view.unmount();
  });

  test("omits the overlay visual on small screens so navigation content stays reachable", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query === "(max-width: 720px)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );

    const view = render(
      <MemoryRouter initialEntries={["/map"]}>
        <Routes>
          <Route
            path="/map"
            element={
              <AppTopNav
                variant="landing"
                landingMode="compact"
                landingTransitionProgress={1}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    const openButton = view.container.querySelector(
      ".app-top-nav__compact-trigger"
    ) as HTMLButtonElement | null;

    act(() => {
      openButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.querySelector(".app-top-nav__landing-overlay-visual")).toBeNull();
    expect(view.container.textContent).toContain("Navigation");
    expect(view.container.textContent).toContain("About us");
    expect(view.container.textContent).toContain("Open map");

    view.unmount();
  });

  test("keeps the original overlay image source on larger screens", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );

    const view = render(
      <MemoryRouter initialEntries={["/map"]}>
        <Routes>
          <Route
            path="/map"
            element={
              <AppTopNav
                variant="landing"
                landingMode="compact"
                landingTransitionProgress={1}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    const openButton = view.container.querySelector(
      ".app-top-nav__compact-trigger"
    ) as HTMLButtonElement | null;

    act(() => {
      openButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const overlayImage = view.container.querySelector(
      ".app-top-nav__landing-overlay-visual-image"
    ) as HTMLImageElement | null;

    expect(overlayImage).not.toBeNull();
    expect(overlayImage?.getAttribute("src")).toContain("2.png");
    expect(overlayImage?.getAttribute("srcset")).toBeNull();

    view.unmount();
  });

  test("lets the desktop poster area briefly switch into a do-not-touch easter egg", () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );

    const view = render(
      <MemoryRouter initialEntries={["/map"]}>
        <Routes>
          <Route
            path="/map"
            element={
              <AppTopNav
                variant="landing"
                landingMode="compact"
                landingTransitionProgress={1}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    const openButton = view.container.querySelector(
      ".app-top-nav__compact-trigger"
    ) as HTMLButtonElement | null;

    act(() => {
      openButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const posterButton = view.container.querySelector(
      ".app-top-nav__landing-overlay-visual-shell"
    ) as HTMLButtonElement | null;

    expect(posterButton?.tagName).toBe("BUTTON");

    act(() => {
      posterButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const easterEgg = view.container.querySelector(
      '[data-testid="landing-overlay-poster-easter-egg"]'
    ) as HTMLElement | null;
    const easterEggImage = view.container.querySelector(
      ".app-top-nav__landing-overlay-easter-egg-image"
    ) as HTMLImageElement | null;

    expect(easterEgg).not.toBeNull();
    expect(easterEggImage?.getAttribute("src")).toContain("menu-poster-no-touch.jpeg");
    expect(view.container.textContent).toContain("Do not click");

    act(() => {
      vi.advanceTimersByTime(1700);
    });

    expect(
      view.container.querySelector('[data-testid="landing-overlay-poster-easter-egg"]')
    ).toBeNull();

    view.unmount();
  });

  test("scales the mobile landing overlay down on shorter phone viewports", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query === "(max-width: 720px)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 390,
    });

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: 640,
    });

    const view = render(
      <MemoryRouter initialEntries={["/map"]}>
        <Routes>
          <Route
            path="/map"
            element={
              <AppTopNav
                variant="landing"
                landingMode="compact"
                landingTransitionProgress={1}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    const root = view.container.querySelector(".app-top-nav--landing-enhanced") as HTMLDivElement | null;
    expect(root?.style.getPropertyValue("--landing-mobile-overlay-scale")).not.toBe("");
    expect(Number(root?.style.getPropertyValue("--landing-mobile-overlay-scale"))).toBeLessThan(1);

    view.unmount();
  });
});
