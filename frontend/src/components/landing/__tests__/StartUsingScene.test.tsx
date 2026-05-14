import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, test } from "vitest";
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
  document.body.innerHTML = "";
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
});
