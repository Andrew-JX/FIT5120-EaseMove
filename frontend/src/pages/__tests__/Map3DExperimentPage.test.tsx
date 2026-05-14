import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

type MockRoutePoint = {
  lng: number;
  lat: number;
};

type MockRouteStepItem = {
  instruction: string;
  modifier: string | null;
  type: string;
  distanceMeters: number;
  roadName: string;
  maneuverPoint: MockRoutePoint | null;
};

type MockRouteSummary = {
  distanceMeters: number;
  durationSeconds: number;
  steps: MockRouteStepItem[];
  profile: "walking" | "cycling";
  geometry: GeoJSON.LineString;
};

type WhiteModelMapProps = {
  mapboxToken: string | null;
  startPoint: MockRoutePoint | null;
  endPoint: MockRoutePoint | null;
  route: MockRouteSummary | null;
  focusedStep: MockRouteStepItem | null;
  showEasePlaces: boolean;
  showNaturalPlaces: boolean;
  showStreetFacilities: boolean;
  onMapClick: (point: MockRoutePoint) => void;
  onMapError: (message: string) => void;
  onEasePlaceSelect?: (
    feature: {
      id: string;
      name: string;
      category: string;
      type: string;
      airConditioned: boolean;
      freeEntry: boolean;
      address: string;
      operatingHours: string;
      reviewSource?: string;
      reviewNote?: string;
      lat: number;
      lng: number;
    },
    point: { x: number; y: number },
    viewport: { width: number; height: number }
  ) => void;
};

let latestMapProps: WhiteModelMapProps | null = null;

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

vi.mock("../../components/WhiteModelMap", async () => {
  const ReactModule = await import("react");

  function MockWhiteModelMap(props: WhiteModelMapProps) {
    latestMapProps = props;

    return (
      <div data-testid="mock-3d-map">
        <p>Mock 3D city view</p>
        <p data-testid="mock-token">{props.mapboxToken ? "token-on" : "token-off"}</p>
        <p data-testid="mock-route-profile">{props.route?.profile ?? "no-route"}</p>
        <p data-testid="mock-layers">
          {JSON.stringify({
            easePlaces: props.showEasePlaces,
            naturalPlaces: props.showNaturalPlaces,
            streetFacilities: props.showStreetFacilities,
          })}
        </p>
        <button type="button" onClick={() => props.onMapClick({ lng: 144.9631, lat: -37.8136 })}>
          Map click start
        </button>
        <button type="button" onClick={() => props.onMapClick({ lng: 144.9812, lat: -37.7991 })}>
          Map click end
        </button>
        <button type="button" onClick={() => props.onMapClick({ lng: 144.9502, lat: -37.8204 })}>
          Map click reset
        </button>
        <button type="button" onClick={() => props.onMapError("Simulated map failure")}>
          Raise map error
        </button>
        <button
          type="button"
          onClick={() =>
            props.onEasePlaceSelect?.(
              {
                id: "cp-22",
                name: "Gimlet at Cavendish House",
                category: "Food & Dining",
                type: "Restaurant recommendation",
                airConditioned: true,
                freeEntry: false,
                address: "33 Russell St, Melbourne VIC 3000",
                operatingHours: "Mon-Sun 12:00 pm - late",
                reviewSource: "Broadsheet",
                reviewNote: "Recognised for polished CBD dining.",
                lat: -37.816,
                lng: 144.9693,
              },
              { x: 180, y: 520 },
              { width: 900, height: 600 }
            )
          }
        >
          Select ease place
        </button>
        {props.startPoint ? <p data-testid="mock-start-marker">start:{props.startPoint.lat},{props.startPoint.lng}</p> : null}
        {props.endPoint ? <p data-testid="mock-end-marker">end:{props.endPoint.lat},{props.endPoint.lng}</p> : null}
        {props.focusedStep ? <p data-testid="mock-focused-step">{props.focusedStep.instruction}</p> : null}
      </div>
    );
  }

  return {
    __esModule: true,
    default: MockWhiteModelMap,
  };
});

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
    async flushTimers(ms = 0) {
      await act(async () => {
        if (ms > 0) {
          vi.advanceTimersByTime(ms);
        }
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

function clickByText(container: HTMLDivElement, text: string) {
  const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes(text));
  expect(button).toBeTruthy();
  act(() => {
    button!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function createRouteResponse(profile: "walking" | "cycling") {
  return {
    routes: [
      {
        distance: profile === "walking" ? 1820 : 2440,
        duration: profile === "walking" ? 1320 : 720,
        geometry: {
          type: "LineString",
          coordinates: [
            [144.9631, -37.8136],
            [144.9728, -37.8079],
            [144.9812, -37.7991],
          ],
        },
        legs: [
          {
            steps: [
              {
                distance: profile === "walking" ? 320 : 510,
                name: "Swanston Street",
                maneuver: {
                  instruction: profile === "walking" ? "Head north on Swanston Street" : "Ride north on Swanston Street",
                  modifier: "straight",
                  type: "depart",
                  location: [144.9631, -37.8136],
                },
              },
              {
                distance: profile === "walking" ? 1500 : 1930,
                name: "La Trobe Street",
                maneuver: {
                  instruction: profile === "walking" ? "Turn right onto La Trobe Street" : "Turn right and continue on La Trobe Street",
                  modifier: "right",
                  type: "turn",
                  location: [144.9728, -37.8079],
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

async function loadPageWithToken(token = "test-mapbox-token") {
  vi.resetModules();
  vi.stubEnv("VITE_MAPBOX_PUBLIC_TOKEN", token);
  const module = await import("../Map3DExperimentPage");
  return module.default;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.restoreAllMocks();
  latestMapProps = null;
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  document.body.innerHTML = "";
});

describe("Map3DExperimentPage - Epic 5", () => {
  test("AC 5.2.1 renders the 3D route page with an explorable city view shell", async () => {
    const Map3DExperimentPage = await loadPageWithToken();
    const view = render(
      <MemoryRouter initialEntries={["/map/3d-route"]}>
        <Routes>
          <Route path="/map/3d-route" element={<Map3DExperimentPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(view.container.textContent).toContain("3D Route Preview");
    expect(view.container.textContent).toContain("Mock 3D city view");
    expect(view.container.textContent).toContain("Drag to pan, scroll to zoom, and right-drag");

    view.unmount();
  });

  test("AC 5.1.1 selects start and end points from consecutive map clicks and requests the default walking route", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => ({
      ok: true,
      json: async () => createRouteResponse(String(input).includes("/cycling/") ? "cycling" : "walking"),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const Map3DExperimentPage = await loadPageWithToken();
    const view = render(
      <MemoryRouter initialEntries={["/map/3d-route"]}>
        <Routes>
          <Route path="/map/3d-route" element={<Map3DExperimentPage />} />
        </Routes>
      </MemoryRouter>
    );

    clickByText(view.container, "Map click start");
    expect(view.container.textContent).toContain("-37.81360, 144.96310");
    expect(view.container.querySelector('[data-testid="mock-start-marker"]')?.textContent).toContain("-37.8136,144.9631");
    expect(fetchMock).not.toHaveBeenCalled();

    clickByText(view.container, "Map click end");
    await view.flush();

    expect(view.container.textContent).toContain("-37.79910, 144.98120");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/walking/");

    view.unmount();
  });

  test("AC 5.1.2, AC 5.1.4 and AC 5.1.5 show the default route, summary metrics, and turn-by-turn directions after a successful response", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => createRouteResponse("walking"),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const Map3DExperimentPage = await loadPageWithToken();
    const view = render(
      <MemoryRouter initialEntries={["/map/3d-route"]}>
        <Routes>
          <Route path="/map/3d-route" element={<Map3DExperimentPage />} />
        </Routes>
      </MemoryRouter>
    );

    clickByText(view.container, "Map click start");
    clickByText(view.container, "Map click end");
    await view.flush();

    expect(view.container.querySelector('[data-testid="mock-route-profile"]')?.textContent).toBe("walking");
    expect(view.container.textContent).toContain("Distance");
    expect(view.container.textContent).toContain("1.8 km");
    expect(view.container.textContent).toContain("Time");
    expect(view.container.textContent).toContain("22 min");
    expect(view.container.textContent).toContain("Directions");
    expect(view.container.textContent).toContain("Head north on Swanston Street");
    expect(view.container.textContent).toContain("Turn right onto La Trobe Street");
    expect(view.container.textContent).toContain("320 m");
    expect(view.container.textContent).toContain("1.5 km");

    clickByText(view.container, "Head north on Swanston Street");
    expect(view.container.querySelector('[data-testid="mock-focused-step"]')?.textContent).toContain(
      "Head north on Swanston Street"
    );

    view.unmount();
  });

  test("AC 5.1.3 and AC 5.1.6 refresh the route, summary, and directions together when travel mode changes", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => ({
      ok: true,
      json: async () => createRouteResponse(String(input).includes("/cycling/") ? "cycling" : "walking"),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const Map3DExperimentPage = await loadPageWithToken();
    const view = render(
      <MemoryRouter initialEntries={["/map/3d-route"]}>
        <Routes>
          <Route path="/map/3d-route" element={<Map3DExperimentPage />} />
        </Routes>
      </MemoryRouter>
    );

    clickByText(view.container, "Map click start");
    clickByText(view.container, "Map click end");
    await view.flush();

    expect(view.container.querySelector('[data-testid="mock-route-profile"]')?.textContent).toBe("walking");
    expect(view.container.textContent).toContain("22 min");
    expect(view.container.textContent).toContain("Head north on Swanston Street");

    clickByText(view.container, "Cycling");
    await view.flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/cycling/");
    expect(view.container.querySelector('[data-testid="mock-route-profile"]')?.textContent).toBe("cycling");
    expect(view.container.textContent).toContain("12 min");
    expect(view.container.textContent).toContain("Ride north on Swanston Street");
    expect(view.container.textContent).toContain("2.4 km");

    view.unmount();
  });

  test("AC 5.1.7 shows a clear route error and allows retrying by switching mode without reloading", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createRouteResponse("cycling"),
      });
    vi.stubGlobal("fetch", fetchMock);

    const Map3DExperimentPage = await loadPageWithToken();
    const view = render(
      <MemoryRouter initialEntries={["/map/3d-route"]}>
        <Routes>
          <Route path="/map/3d-route" element={<Map3DExperimentPage />} />
        </Routes>
      </MemoryRouter>
    );

    clickByText(view.container, "Map click start");
    clickByText(view.container, "Map click end");
    await view.flush();

    expect(view.container.textContent).toContain("Route could not be loaded");
    expect(view.container.textContent).toContain("Directions API returned 502.");
    expect(view.container.textContent).toContain("switch travel mode without reloading");

    clickByText(view.container, "Cycling");
    await view.flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(view.container.textContent).toContain("12 min");
    expect(view.container.textContent).toContain("Ride north on Swanston Street");

    view.unmount();
  });

  test("AC 5.2.3 and AC 5.2.4 toggle place-based layers without removing the current route state", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => createRouteResponse("walking"),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const Map3DExperimentPage = await loadPageWithToken();
    const view = render(
      <MemoryRouter initialEntries={["/map/3d-route"]}>
        <Routes>
          <Route path="/map/3d-route" element={<Map3DExperimentPage />} />
        </Routes>
      </MemoryRouter>
    );

    clickByText(view.container, "Map click start");
    clickByText(view.container, "Map click end");
    await view.flush();

    clickByText(view.container, "Layers");
    clickByText(view.container, "Natural Places");

    expect(latestMapProps?.showNaturalPlaces).toBe(true);
    expect(view.container.querySelector('[data-testid="mock-route-profile"]')?.textContent).toBe("walking");
    expect(view.container.textContent).toContain("Layer legend");
    expect(view.container.textContent).toContain("Waterbody");

    clickByText(view.container, "Ease Places");
    expect(latestMapProps?.showEasePlaces).toBe(true);
    expect(view.container.textContent).toContain("Arts, Culture & Enrichment");
    expect(view.container.textContent).toContain("Food & Dining");

    clickByText(view.container, "Public Facilities");
    expect(latestMapProps?.showStreetFacilities).toBe(true);

    const legendPanel = view.container.querySelector('[data-testid="active-layer-legends"]');
    expect(legendPanel).toBeTruthy();
    expect(legendPanel?.className).toContain("overflow-y-auto");

    clickByText(view.container, "Natural Places");
    expect(latestMapProps?.showNaturalPlaces).toBe(false);
    expect(latestMapProps?.showEasePlaces).toBe(true);

    view.unmount();
  });

  test("additional Epic 5 coverage: timeout errors surface clearly and the user can recover by reselecting points", async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise((resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        void resolve;
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const Map3DExperimentPage = await loadPageWithToken();
    const view = render(
      <MemoryRouter initialEntries={["/map/3d-route"]}>
        <Routes>
          <Route path="/map/3d-route" element={<Map3DExperimentPage />} />
        </Routes>
      </MemoryRouter>
    );

    clickByText(view.container, "Map click start");
    clickByText(view.container, "Map click end");
    await view.flushTimers(12000);

    expect(view.container.textContent).toContain("Route request timed out");
    expect(view.container.textContent).toContain("Try another point or switch travel mode.");

    clickByText(view.container, "Map click reset");
    expect(view.container.textContent).toContain("-37.82040, 144.95020");
    expect(view.container.textContent).toContain("Not selected");

    view.unmount();
  });

  test("additional Epic 5 coverage: map-level failures are surfaced in the panel", async () => {
    const Map3DExperimentPage = await loadPageWithToken();
    const view = render(
      <MemoryRouter initialEntries={["/map/3d-route"]}>
        <Routes>
          <Route path="/map/3d-route" element={<Map3DExperimentPage />} />
        </Routes>
      </MemoryRouter>
    );

    clickByText(view.container, "Raise map error");

    expect(view.container.textContent).toContain("3D map problem");
    expect(view.container.textContent).toContain("Simulated map failure");

    view.unmount();
  });

  test("additional Epic 5 coverage: clicking an Ease Place on the 3D map opens the shared detail popup", async () => {
    const Map3DExperimentPage = await loadPageWithToken();
    const view = render(
      <MemoryRouter initialEntries={["/map/3d-route"]}>
        <Routes>
          <Route path="/map/3d-route" element={<Map3DExperimentPage />} />
        </Routes>
      </MemoryRouter>
    );

    clickByText(view.container, "Layers");
    clickByText(view.container, "Ease Places");
    clickByText(view.container, "Select ease place");

    expect(view.container.textContent).toContain("Gimlet at Cavendish House");
    expect(view.container.textContent).toContain("Recommended by");
    expect(view.container.textContent).toContain("Broadsheet");
    expect(view.container.textContent).toContain("Why it stands out");

    view.unmount();
  });

  test("top-five guide navigation preloads only the end point and still triggers current-location flow", async () => {
    const geolocationMock = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: -37.8136,
          longitude: 144.9631,
          accuracy: 24,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      } as GeolocationPosition);
    });

    vi.stubGlobal("navigator", {
      ...window.navigator,
      geolocation: {
        getCurrentPosition: geolocationMock,
      },
    });

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => createRouteResponse("walking"),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const Map3DExperimentPage = await loadPageWithToken();
    const view = render(
      <MemoryRouter
        initialEntries={[
          "/map/3d-route?endLat=-37.82230&endLng=144.95220&endName=Docklands&autoLocateStart=1",
        ]}
      >
        <Routes>
          <Route path="/map/3d-route" element={<Map3DExperimentPage />} />
        </Routes>
      </MemoryRouter>
    );

    await view.flush();

    expect(geolocationMock).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).not.toContain("0.00000, 0.00000");
    expect(view.container.textContent).toContain("-37.81360, 144.96310");
    expect(view.container.textContent).toContain("-37.82230, 144.95220");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    view.unmount();
  });
});
