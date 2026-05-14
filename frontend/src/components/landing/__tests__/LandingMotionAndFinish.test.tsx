import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import HowToUseScene from "../HowToUseScene";
import StartUsingScene from "../StartUsingScene";

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
});

describe("landing presentation hooks", () => {
  test("reveals the start scene title animation only after the scene enters view", () => {
    const view = render(
      <MemoryRouter>
        <StartUsingScene />
      </MemoryRouter>
    );

    const scene = view.container.querySelector(".landing-start-scene");
    expect(scene?.classList.contains("is-title-revealed")).toBe(false);
    expect(observerOptions[0]).toMatchObject({
      threshold: 0.72,
      rootMargin: "-4% 0px -18% 0px",
    });

    act(() => {
      observerCallbacks[0]?.([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    expect(scene?.classList.contains("is-title-revealed")).toBe(true);
    expect(view.container.querySelector(".landing-start-title-main.back-in-left")).not.toBeNull();
    expect(view.container.querySelector(".landing-start-title-echo.back-in-right")).not.toBeNull();

    view.unmount();
  });

  test("adds the glass finish hook to the how-to step preview card", () => {
    const view = render(
      <MemoryRouter>
        <HowToUseScene />
      </MemoryRouter>
    );

    expect(view.container.querySelector(".landing-how-step-preview.is-glass-finish")).not.toBeNull();

    view.unmount();
  });
});
