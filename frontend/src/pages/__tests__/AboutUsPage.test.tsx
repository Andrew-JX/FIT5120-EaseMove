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
  test("renders the about page hero, project story, and archive entry point", () => {
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

    expect(text).toContain("See urban comfort before the street asks you to react.");
    expect(text).toContain("MoveComfortly helps walkers, cyclists, students, and young workers");
    expect(text).toContain("Heat-aware departures");
    expect(text).toContain("Street-level reassurance");
    expect(text).toContain("Project archive");
    expect(text).toContain("Open Monash ePortfolio");
    expect(text).toContain("Open 3D route");
    expect(text).not.toContain("static project summary");

    view.unmount();
  });

  test("surfaces product capabilities and evidence framing", () => {
    const view = render(
      <MemoryRouter initialEntries={["/aboutus"]}>
        <Routes>
          <Route path="/aboutus" element={<AboutUsPage />} />
        </Routes>
      </MemoryRouter>
    );

    const text = pageText(view.container);

    expect(text).toContain("Route atmosphere");
    expect(text).toContain("Map intelligence");
    expect(text).toContain("3D route preview");
    expect(text).toContain("Risk guidance");
    expect(text).toContain("Support-place context");
    expect(text).toContain("Drag sideways to explore all six layers");
    expect(text).toContain("Public data context");
    expect(text).toContain("Comparative guidance");
    expect(text).toContain("Educational framing");
    expect(text).not.toContain("The motion is theatrical");

    view.unmount();
  });

  test("back returns to the previous page when history exists", () => {
    const view = render(
      <MemoryRouter initialEntries={["/map", "/aboutus"]} initialIndex={1}>
        <Routes>
          <Route path="/aboutus" element={<AboutUsPage />} />
          <Route path="/map" element={<div>Map page</div>} />
        </Routes>
      </MemoryRouter>
    );

    const button = Array.from(view.container.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Back")
    );

    expect(button).toBeTruthy();

    act(() => {
      button!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(pageText(view.container)).toContain("Map page");

    view.unmount();
  });

  test("back falls back to the landing page when there is no previous history entry", () => {
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    const view = render(
      <MemoryRouter initialEntries={["/aboutus"]}>
        <Routes>
          <Route path="/aboutus" element={<AboutUsPage />} />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </MemoryRouter>
    );

    replaceStateSpy.mockImplementation((data, unused, url) => {
      return History.prototype.replaceState.call(window.history, { ...(data as object), idx: 0 }, unused, url);
    });
    window.history.replaceState({ idx: 0 }, "", "/aboutus");

    const button = Array.from(view.container.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Back")
    );

    expect(button).toBeTruthy();

    act(() => {
      button!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(pageText(view.container)).toContain("Home page");

    view.unmount();
  });
});
