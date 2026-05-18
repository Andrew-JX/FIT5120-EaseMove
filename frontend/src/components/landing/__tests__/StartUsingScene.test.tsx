import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import StartUsingScene from "../StartUsingScene";

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

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

beforeEach(() => {
  vi.useFakeTimers();
});

describe("StartUsingScene", () => {
  test("shows only the Map and 3D Route action buttons", () => {
    const view = render(
      <MemoryRouter>
        <StartUsingScene />
      </MemoryRouter>
    );

    const buttons = Array.from(view.container.querySelectorAll(".landing-start-neo-button"));
    const labels = buttons.map((button) => button.getAttribute("aria-label"));

    expect(labels).toEqual(["Map", "3D Route"]);
    expect(view.container.textContent).not.toContain("Go to compare");
    expect(view.container.textContent).not.toContain("Check risks");
    expect(view.container.textContent).not.toContain(
      "Use the live map for place decisions, or switch to the 3D route view when you want to preview the journey itself."
    );

    view.unmount();
  });

  test("uses compact helper copy for the two primary actions", () => {
    const view = render(
      <MemoryRouter>
        <StartUsingScene />
      </MemoryRouter>
    );

    const copyBlocks = Array.from(view.container.querySelectorAll(".landing-start-action-copy")).map(
      (node) => node.textContent?.trim()
    );

    expect(copyBlocks).toEqual([
      "Compare comfort, adjust preferences, and find support places nearby.",
      "Preview your route in 3D and rehearse the trip before you go.",
    ]);

    view.unmount();
  });

  test("shows the roaming spider cat on desktop and surfaces a tip bubble after it pauses", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query === "(pointer: fine)" || query === "(min-width: 821px)",
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
      <MemoryRouter>
        <StartUsingScene />
      </MemoryRouter>
    );

    const spiderCat = view.container.querySelector('[data-testid="landing-spider-cat"]') as HTMLElement | null;
    expect(spiderCat).not.toBeNull();
    expect(view.container.querySelector('[data-testid="landing-spider-cat-tip"]')).toBeNull();
    expect(spiderCat?.dataset.spiderState).toBe("moving");

    act(() => {
      vi.advanceTimersByTime(6400);
    });

    expect(view.container.querySelector('[data-testid="landing-spider-cat-tip"]')?.textContent).toContain(
      "Map first?"
    );
    expect(spiderCat?.dataset.spiderState).toBe("thinking");

    view.unmount();
  });

  test("pauses and talks when the desktop spider cat is hovered", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query === "(pointer: fine)" || query === "(min-width: 821px)",
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
      <MemoryRouter>
        <StartUsingScene />
      </MemoryRouter>
    );

    const spiderCat = view.container.querySelector('[data-testid="landing-spider-cat"]') as HTMLElement | null;
    expect(spiderCat).not.toBeNull();

    act(() => {
      spiderCat?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });

    expect(view.container.querySelector('[data-testid="landing-spider-cat-tip"]')?.textContent).toContain("Map first?");
    expect(spiderCat?.dataset.spiderState).toBe("thinking");

    act(() => {
      spiderCat?.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
    });

    expect(view.container.querySelector('[data-testid="landing-spider-cat-tip"]')).toBeNull();

    view.unmount();
  });

  test("does not render the roaming spider cat on touch-sized screens", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query === "(max-width: 820px)",
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
      <MemoryRouter>
        <StartUsingScene />
      </MemoryRouter>
    );

    expect(view.container.querySelector('[data-testid="landing-spider-cat"]')).toBeNull();
    expect(view.container.querySelector('[data-testid="landing-spider-cat-tip"]')).toBeNull();

    view.unmount();
  });
});
