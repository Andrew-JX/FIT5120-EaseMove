import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const navigateToMock = vi.fn();

vi.mock("../../lib/navigation", () => ({
  navigateTo: (path: string) => navigateToMock(path),
}));

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
      svg: createMotionComponent("svg"),
      g: createMotionComponent("g"),
      path: createMotionComponent("path"),
    },
  };
});

import ExtremeWeatherRisksPage from "../ExtremeWeatherRisksPage";

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
  const ringSection = sections[1];
  expect(ringSection).toBeTruthy();
  return Array.from(ringSection.querySelectorAll("svg path"));
}

beforeEach(() => {
  vi.useFakeTimers();
  navigateToMock.mockReset();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("ExtremeWeatherRisksPage - Epic 4", () => {
  test("renders the hero section and section navigation labels", () => {
    const view = render(<ExtremeWeatherRisksPage />);

    expect(view.container.textContent).toContain("Extreme Weather");
    expect(view.container.textContent).toContain(
      "Understanding the risks and impacts of severe weather events on human health and safety"
    );
    expect(view.container.textContent).toContain("Extreme Weather Introduction");
    expect(view.container.textContent).toContain("Circle");
    expect(view.container.textContent).toContain("Risk Detail");
    expect(view.container.textContent).toContain("Start Quiz");

    view.unmount();
  });

  test("clicking a weather segment shows the selected risk summary and severity legend", () => {
    const view = render(<ExtremeWeatherRisksPage />);

    const svgPaths = getCircleSegmentPaths(view.container);
    expect(svgPaths.length).toBe(5);

    act(() => {
      svgPaths[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.textContent).toContain("Heat");
    expect(view.container.textContent).not.toContain("Select a weather type");
    expect(view.container.textContent).toContain("Heat Stroke");
    expect(view.container.textContent).toContain("Smoke Exposure");
    expect(view.container.textContent).toContain("Impact on Human Body:");
    expect(view.container.textContent).toContain("Severity: High");
    expect(view.container.textContent).toContain("Learn More");
    expect(view.container.textContent).toContain("High:");
    expect(view.container.textContent).toContain("Moderate:");
    expect(view.container.textContent).toContain("Mild:");

    view.unmount();
  });

  test("clicking Learn More scrolls to the risk detail section for the selected weather type", async () => {
    const scrollIntoViewMock = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    const view = render(<ExtremeWeatherRisksPage />);

    const svgPaths = getCircleSegmentPaths(view.container);

    act(() => {
      svgPaths[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const learnMoreButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Learn More")
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
    const view = render(<ExtremeWeatherRisksPage />);

    const enterQuizButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Enter Quiz")
    );
    expect(enterQuizButton).toBeTruthy();

    act(() => {
      enterQuizButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(navigateToMock).toHaveBeenCalledWith("/extreme-weather-risks-quiz");

    view.unmount();
  });
});
