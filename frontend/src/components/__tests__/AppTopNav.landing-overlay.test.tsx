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
});
