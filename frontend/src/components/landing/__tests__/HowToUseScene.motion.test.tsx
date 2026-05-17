import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const timelineCalls: Array<[unknown, Record<string, unknown>, string | undefined]> = [];

vi.mock("animejs", () => {
  return {
    createScope: () => ({
      add(callback: () => void) {
        callback();
        return {
          revert() {},
        };
      },
    }),
    createTimeline: () => ({
      add(target: unknown, config: Record<string, unknown>, offset?: string) {
        timelineCalls.push([target, config, offset]);
        return this;
      },
    }),
    stagger: () => 0,
  };
});

import HowToUseScene from "../HowToUseScene";

type ObserverCallback = (entries: IntersectionObserverEntry[]) => void;

let observerCallbacks: ObserverCallback[] = [];

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
  timelineCalls.length = 0;
  observerCallbacks = [];

  vi.stubGlobal(
    "IntersectionObserver",
    class MockIntersectionObserver {
      constructor(private readonly callback: ObserverCallback) {
        observerCallbacks.push(callback);
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

describe("HowToUseScene motion choreography", () => {
  test("does not add a second bounce animation to the tap-for-details chip after it enters", () => {
    const view = render(
      <MemoryRouter>
        <HowToUseScene />
      </MemoryRouter>
    );

    const actionChip = view.container.querySelector(".landing-how-action-bar > .landing-how-flip-chip");
    expect(actionChip).not.toBeNull();

    act(() => {
      observerCallbacks[0]?.([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    const actionChipCalls = timelineCalls.filter(([target]) => target === actionChip);
    expect(actionChipCalls).toHaveLength(1);
    expect(actionChipCalls[0]?.[1]).toMatchObject({
      opacity: [0, 1],
      x: ["24vw", "0vw"],
      scale: [0.9, 1],
    });

    view.unmount();
  });
});
