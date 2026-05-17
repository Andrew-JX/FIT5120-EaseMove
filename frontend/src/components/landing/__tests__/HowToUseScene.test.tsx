import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import HowToUseScene from "../HowToUseScene";

type ObserverCallback = (entries: IntersectionObserverEntry[]) => void;

let observerCallbacks: ObserverCallback[] = [];
let observerOptions: IntersectionObserverInit[] = [];

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

beforeEach(() => {
  observerCallbacks = [];
  observerOptions = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class MockIntersectionObserver {
      constructor(private readonly callback: ObserverCallback, options?: IntersectionObserverInit) {
        observerCallbacks.push(callback);
        observerOptions.push(options ?? {});
      }

      observe() {}

      unobserve() {}

      disconnect() {}
    }
  );
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("HowToUseScene", () => {
  test("reveals the section choreography only after the scene enters view", () => {
    const view = render(
      <MemoryRouter>
        <HowToUseScene />
      </MemoryRouter>
    );

    const scene = view.container.querySelector(".landing-how-scene");
    expect(scene?.classList.contains("is-motion-ready")).toBe(true);
    expect(scene?.classList.contains("is-revealed")).toBe(false);
    expect(scene?.getAttribute("data-choreo-seq")).toBe("0");
    expect(observerOptions[0]).toMatchObject({
      threshold: 0.56,
      rootMargin: "0px 0px -6% 0px",
    });

    act(() => {
      observerCallbacks[0]?.([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    expect(scene?.classList.contains("is-revealed")).toBe(true);
    expect(scene?.getAttribute("data-choreo-seq")).toBe("1");
    expect(view.container.querySelector(".landing-how-preview-copy")).not.toBeNull();
    expect(view.container.querySelector(".landing-how-action-text-shell")).not.toBeNull();

    view.unmount();
  });

  test("keeps step selection, keyboard navigation, and flip reset behavior intact", () => {
    const view = render(
      <MemoryRouter>
        <HowToUseScene />
      </MemoryRouter>
    );

    const stepButtons = Array.from(
      view.container.querySelectorAll(".landing-how-step-tile")
    ) as HTMLButtonElement[];
    const flipButton = view.container.querySelector(".landing-how-flip-card") as HTMLButtonElement | null;
    const viewport = view.container.querySelector(".landing-how-steps-viewport") as HTMLDivElement | null;

    expect(stepButtons).toHaveLength(4);
    expect(view.container.textContent).toContain("Landing Page overview and project story");
    expect(view.container.textContent).toContain("Open Landing");

    act(() => {
      stepButtons[2]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(stepButtons[2]?.getAttribute("aria-pressed")).toBe("true");
    expect(view.container.textContent).toContain("Extreme weather risks and safety guidance");
    expect(view.container.textContent).toContain("Open Risks");

    act(() => {
      flipButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.querySelector(".landing-how-flip-scene")?.className).toContain("is-flipped");

    act(() => {
      viewport?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });

    expect(view.container.textContent).toContain("3D route planning and route comparison tools");
    expect(view.container.textContent).toContain("Open 3D Route");
    expect(view.container.querySelector(".landing-how-flip-scene")?.className).not.toContain("is-flipped");

    view.unmount();
  });
});
