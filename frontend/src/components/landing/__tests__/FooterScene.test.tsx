import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import FooterScene from "../FooterScene";

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

describe("FooterScene", () => {
  const originalIntersectionObserver = window.IntersectionObserver;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.scrollTo = vi.fn();
    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      value: originalIntersectionObserver,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: originalMatchMedia,
    });
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  test("renders the footer closing line as two animated halves", () => {
    const view = render(
      <MemoryRouter>
        <FooterScene />
      </MemoryRouter>
    );

    const line = view.container.querySelector(".landing-footer-closing-line");

    expect(line).not.toBeNull();
    expect(line?.getAttribute("aria-label")).toBe("Find a place in Melbourne that suits you better.");
    expect(line?.classList.contains("is-revealed")).toBe(true);
    expect(view.container.querySelector(".landing-footer-closing-final")?.textContent).toBe(
      "Find a place in Melbourne that suits you better."
    );
    expect(view.container.querySelector(".landing-footer-closing-build")).not.toBeNull();
    expect(view.container.querySelector(".landing-footer-closing-half--left")?.textContent).toBe(
      "Find a place in Melbourne"
    );
    expect(view.container.querySelector(".landing-footer-closing-half--right")?.textContent).toBe(
      "that suits you better."
    );
    expect(view.container.querySelector(".landing-footer-closing-join")).not.toBeNull();

    view.unmount();
  });
});
