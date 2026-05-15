import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("motion/react", async () => {
  const ReactModule = await import("react");
  const createMotionComponent = (tag: keyof React.JSX.IntrinsicElements) =>
    ReactModule.forwardRef<HTMLElement, React.JSX.IntrinsicElements[typeof tag]>(
      ({ children, ...props }, ref) => ReactModule.createElement(tag, { ...props, ref }, children)
    );

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: createMotionComponent("div"),
      h2: createMotionComponent("h2"),
      button: createMotionComponent("button"),
      svg: createMotionComponent("svg"),
      g: createMotionComponent("g"),
      path: createMotionComponent("path"),
    },
  };
});

import ExtremeWeatherRisksPage from "../ExtremeWeatherRisksPage";

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

function render(element: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return {
    container,
    async flush() {
      await act(async () => {
        await Promise.resolve();
      });
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function getCircleSegmentPaths(container: HTMLDivElement) {
  const sections = Array.from(container.querySelectorAll("section"));
  const ringSection = sections[0];
  expect(ringSection).toBeTruthy();
  return Array.from(ringSection.querySelectorAll("svg path"));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("ExtremeWeatherRisksPage - Epic 4", () => {
  test("renders the ring section directly and section navigation labels", () => {
    const view = render(
      <MemoryRouter initialEntries={["/extreme-weather-risks"]}>
        <Routes>
          <Route path="/extreme-weather-risks" element={<ExtremeWeatherRisksPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(view.container.textContent).toContain("Extreme Weather Panel");
    expect(view.container.textContent).toContain("Start Quiz");

    view.unmount();
  });

  test("clicking a weather segment shows the selected risk summary and severity legend", () => {
    const view = render(
      <MemoryRouter initialEntries={["/extreme-weather-risks"]}>
        <Routes>
          <Route path="/extreme-weather-risks" element={<ExtremeWeatherRisksPage />} />
        </Routes>
      </MemoryRouter>
    );

    const svgPaths = getCircleSegmentPaths(view.container);
    expect(svgPaths.length).toBe(3);

    act(() => {
      svgPaths[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.textContent).toContain("Heat");
    expect(view.container.textContent).not.toContain("Select a weather type");
    expect(view.container.textContent).toContain("Heat Stroke");
    expect(view.container.textContent).toContain("Smoke Exposure");
    expect(view.container.textContent).toContain("Impact on Human Body:");
    expect(view.container.textContent).toContain("Severity: High");
    expect(view.container.textContent).toContain("Explore Impacts");

    view.unmount();
  });

  test("clicking Learn More scrolls to the risk detail section for the selected weather type", async () => {
    const scrollIntoViewMock = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    const view = render(
      <MemoryRouter initialEntries={["/extreme-weather-risks"]}>
        <Routes>
          <Route path="/extreme-weather-risks" element={<ExtremeWeatherRisksPage />} />
        </Routes>
      </MemoryRouter>
    );

    const svgPaths = getCircleSegmentPaths(view.container);

    act(() => {
      svgPaths[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const learnMoreButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Explore Impacts")
    );
    expect(learnMoreButton).toBeTruthy();

    act(() => {
      learnMoreButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      vi.advanceTimersByTime(450);
    });

    expect(scrollIntoViewMock).toHaveBeenCalled();
    expect(view.container.textContent).toContain("Why it happens");
    expect(view.container.textContent).toContain("What you can do");

    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    view.unmount();
  });

  test("clicking Enter Quiz navigates to the extreme weather quiz page", () => {
    const view = render(
      <MemoryRouter initialEntries={["/extreme-weather-risks"]}>
        <Routes>
          <Route
            path="/extreme-weather-risks"
            element={
              <>
                <ExtremeWeatherRisksPage />
                <LocationDisplay />
              </>
            }
          />
          <Route path="/extreme-weather-risks-quiz" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    );

    const enterQuizButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Enter Quiz")
    );
    expect(enterQuizButton).toBeTruthy();

    act(() => {
      enterQuizButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.querySelector('[data-testid="location-display"]')?.textContent).toBe(
      "/extreme-weather-risks-quiz"
    );

    view.unmount();
  });
});
