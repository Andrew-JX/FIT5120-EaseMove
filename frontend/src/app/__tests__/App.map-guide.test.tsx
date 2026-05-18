import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, test, vi } from "vitest";
import App from "../App";

const appTopNavMock = vi.fn(() => <div data-testid="app-top-nav" />);

vi.mock("../../hooks/usePrecincts", () => ({
  usePrecincts: () => ({
    precincts: [
      {
        id: "melbourne-cbd",
        name: "Melbourne CBD",
        lat: -37.8136,
        lng: 144.9631,
        comfort_score: 82,
        comfort_label: "Comfortable",
        temperature: 23,
        humidity: 45,
        activity_level: "Low",
        wind_speed: 4,
        pm25: 9,
      },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock("../../components/AppTopNav", () => ({
  default: (props: unknown) => appTopNavMock(props),
}));

vi.mock("../../components/LeafletMap", () => ({
  default: () => <div data-testid="leaflet-map" />,
}));

vi.mock("../../components/map/EasePlacesDetailPopup", () => ({
  default: () => null,
}));

vi.mock("../../components/map/DynamicLegendPanel", () => ({
  default: () => <div data-testid="dynamic-legend-panel" />,
}));

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
  appTopNavMock.mockClear();
});

describe("App map guide", () => {
  test("opens the interactive map quick guide once per runtime when entering /map", () => {
    const view = render(
      <MemoryRouter initialEntries={["/map"]}>
        <Routes>
          <Route path="/map" element={<App mode="view" />} />
        </Routes>
      </MemoryRouter>
    );

    expect(view.container.textContent).toContain("Tips Guide");
    expect(view.container.textContent).toContain(
      "Comfort Area shows precinct scores and lets you open each score card."
    );

    view.unmount();

    const secondView = render(
      <MemoryRouter initialEntries={["/map"]}>
        <Routes>
          <Route path="/map" element={<App mode="view" />} />
        </Routes>
      </MemoryRouter>
    );

    expect(secondView.container.textContent).not.toContain("Tips Guide");
    secondView.unmount();
  });

  test("uses the same compact landing menu shell on /map as the landing and 3D route pages", () => {
    render(
      <MemoryRouter initialEntries={["/map"]}>
        <Routes>
          <Route path="/map" element={<App />} />
        </Routes>
      </MemoryRouter>
    );

    expect(appTopNavMock).toHaveBeenCalled();
    expect(appTopNavMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "landing",
        landingMode: "compact",
        landingTone: "dark",
        landingOverlayContext: "map",
        className: "app-top-nav--map-overlay",
      })
    );
  });
});
