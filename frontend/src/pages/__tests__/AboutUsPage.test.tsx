import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import AboutUsPage from "../AboutUsPage";

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
});

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
});

describe("AboutUsPage", () => {
  test("renders the upgraded about page story beats and product capability panel", () => {
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

    expect(text).toContain("Urban comfort, seen before the trip starts.");
    expect(text).toContain("Comfort score");
    expect(text).toContain("Route preview");
    expect(text).toContain("Risk guidance");
    expect(text).toContain("Local signals");
    expect(text).toContain("A clearer picture before you leave.");
    expect(text).toContain("Open 3D route");

    view.unmount();
  });

  test("surfaces the research pillars and portfolio framing copy", () => {
    const view = render(
      <MemoryRouter initialEntries={["/aboutus"]}>
        <Routes>
          <Route path="/aboutus" element={<AboutUsPage />} />
        </Routes>
      </MemoryRouter>
    );

    const text = pageText(view.container);

    expect(text).toContain("Walkability");
    expect(text).toContain("Microclimate");
    expect(text).toContain("Weather safety");
    expect(text).toContain("Research / Process / Documentation");

    view.unmount();
  });
});
