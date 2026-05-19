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
  routeProgress: number | null;
  routePlaybackMode: "idle" | "autoplay" | "live";
  followPet: boolean;
  liveTrackedPoint?: MockRoutePoint | null;
  focusedStep: MockRouteStepItem | null;
  showEasePlaces: boolean;
  showNaturalPlaces: boolean;
  showStreetFacilities: boolean;
  showNavigationControl?: boolean;
  onMapClick: (point: MockRoutePoint) => void;
  onMapError: (message: string) => void;
  onViewportControlsReady?: (controls: { zoomIn: () => void; zoomOut: () => void } | null) => void;
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
    LayoutGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      aside: createMotionComponent("aside"),
      button: createMotionComponent("button"),
      div: createMotionComponent("div"),
      span: createMotionComponent("span"),
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

    ReactModule.useEffect(() => {
      props.onViewportControlsReady?.({
        zoomIn: vi.fn(),
        zoomOut: vi.fn(),
      });
      return () => {
        props.onViewportControlsReady?.(null);
      };
    }, []);

    return (
      <div data-testid="mock-3d-map">
        <p>Mock 3D city view</p>
        <p data-testid="mock-token">{props.mapboxToken ? "token-on" : "token-off"}</p>
        <p data-testid="mock-route-profile">{props.route?.profile ?? "no-route"}</p>
        <p data-testid="mock-route-progress">
          {typeof props.routeProgress !== "number" ? "none" : props.routeProgress.toFixed(3)}
        </p>
        <p data-testid="mock-route-playback-mode">{props.routePlaybackMode ?? "missing"}</p>
        <p data-testid="mock-follow-pet">{String(props.followPet ?? false)}</p>
        <p data-testid="mock-live-tracked-point">
          {props.liveTrackedPoint ? `${props.liveTrackedPoint.lat.toFixed(4)},${props.liveTrackedPoint.lng.toFixed(4)}` : "none"}
        </p>
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
        <button type="button" onClick={() => props.onMapClick({ lng: 151.2093, lat: -33.8688 })}>
          Map click australia
        </button>
        <button type="button" onClick={() => props.onMapClick({ lng: 103.8198, lat: 1.3521 })}>
          Map click outside
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
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      media: "(max-width: 1023px)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  window.localStorage.clear();
  window.sessionStorage.clear();
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
    expect(view.container.textContent).toContain("Tap Start to lock or re-arm map picking");
    expect(
      view.container.querySelector('button[aria-label="Open landing navigation menu"]')
    ).toBeTruthy();

    view.unmount();
  });

  test("shows the landing-style MENU/CLOSE control on the 3D page and opens the overlay navigation", async () => {
    const Map3DExperimentPage = await loadPageWithToken();
    const view = render(
      <MemoryRouter initialEntries={["/map/3d-route"]}>
        <Routes>
          <Route path="/map/3d-route" element={<Map3DExperimentPage />} />
        </Routes>
      </MemoryRouter>
    );

    const openButton = view.container.querySelector('button[aria-label="Open landing navigation menu"]');
    expect(openButton).toBeTruthy();

    act(() => {
      openButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await view.flushTimers(800);

    expect(
      view.container.querySelector('button[aria-label="Close landing navigation menu"]')
    ).toBeTruthy();
    expect(view.container.textContent).toContain("Landing Page");
    expect(view.container.textContent).toContain("3D Route");

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
    expect(view.container.querySelector('[data-testid="point-badge-start"]')?.textContent).toBe("S");
    expect(view.container.querySelector('[data-testid="point-badge-start"]')?.className).toContain("border-[4px]");
    expect(view.container.querySelector('[data-testid="point-badge-end"]')?.textContent).toBe("E");
    expect(view.container.querySelector('[data-testid="point-badge-end"]')?.className).toContain("border-[4px]");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/walking/");

    view.unmount();
  });

  test("accepts map clicks anywhere inside Australia, even outside Melbourne", async () => {
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
    clickByText(view.container, "Map click australia");
    await view.flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).toContain("-33.86880, 151.20930");
    expect(view.container.textContent).not.toContain("Outside supported area");

    view.unmount();
  });

  test("rejects map clicks outside Australia and keeps the current route state unchanged", async () => {
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
    expect(view.container.textContent).toContain("-37.81360, 144.96310");

    clickByText(view.container, "Map click outside");
    await view.flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("Outside supported area");
    expect(view.container.textContent).toContain("Only locations inside Australia");
    expect(view.container.textContent).toContain("-37.81360, 144.96310");
    expect(view.container.textContent).toContain("Not selected");

    view.unmount();
  });

  test("map point selection toggle locks map clicks until the user turns it back on", async () => {
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
    expect(view.container.textContent).toContain("-37.81360, 144.96310");

    const selectionToggle = view.container.querySelector('button[aria-label="Disable map point selection"]');
    expect(selectionToggle).toBeTruthy();

    act(() => {
      selectionToggle!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    clickByText(view.container, "Map click end");
    await view.flush();

    expect(view.container.textContent).toContain("Not selected");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(view.container.querySelector('button[aria-label="Enable map point selection"]')).toBeTruthy();

    const enableSelectionToggle = view.container.querySelector('button[aria-label="Enable map point selection"]');
    expect(enableSelectionToggle).toBeTruthy();

    act(() => {
      enableSelectionToggle!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    clickByText(view.container, "Map click end");
    await view.flush();

    expect(view.container.textContent).toContain("-37.79910, 144.98120");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    view.unmount();
  });

  test("the Start card can also lock and unlock map point selection with a highlighted status", async () => {
    const Map3DExperimentPage = await loadPageWithToken();
    const view = render(
      <MemoryRouter initialEntries={["/map/3d-route"]}>
        <Routes>
          <Route path="/map/3d-route" element={<Map3DExperimentPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(view.container.textContent).toContain("Map picking ON");
    expect(view.container.textContent).toContain("Tap Start to lock or re-arm map picking");

    const startToggle = view.container.querySelector('button[aria-label="Disable map point selection from Start card"]');
    expect(startToggle).toBeTruthy();

    act(() => {
      startToggle!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.textContent).toContain("Map picking LOCKED");

    const startUnlock = view.container.querySelector('button[aria-label="Enable map point selection from Start card"]');
    expect(startUnlock).toBeTruthy();

    act(() => {
      startUnlock!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.textContent).toContain("Map picking ON");

    view.unmount();
  });

  test("deleting start and end does not unlock map point selection automatically", async () => {
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

    const disableSelectionToggle = view.container.querySelector('button[aria-label="Disable map point selection"]');
    expect(disableSelectionToggle).toBeTruthy();

    act(() => {
      disableSelectionToggle!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const deleteStartButton = view.container.querySelector('button[aria-label="Delete Start point"]');
    expect(deleteStartButton).toBeTruthy();

    act(() => {
      deleteStartButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    clickByText(view.container, "Map click reset");
    await view.flush();

    expect(view.container.textContent).toContain("Not selected");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector('button[aria-label="Enable map point selection"]')).toBeTruthy();

    const reenableSelectionToggle = view.container.querySelector('button[aria-label="Enable map point selection"]');
    expect(reenableSelectionToggle).toBeTruthy();

    act(() => {
      reenableSelectionToggle!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    clickByText(view.container, "Map click reset");

    expect(view.container.textContent).toContain("-37.82040, 144.95020");

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
    expect(view.container.querySelector('[data-testid="mock-route-playback-mode"]')?.textContent).toBe("autoplay");
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

  test("autoplay advances route progress after the route loads and resets when travel mode changes", async () => {
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

    expect(view.container.querySelector('[data-testid="mock-route-playback-mode"]')?.textContent).toBe("autoplay");
    expect(view.container.querySelector('[data-testid="mock-route-progress"]')?.textContent).toBe("0.000");

    await view.flushTimers(1400);

    const autoplayProgress = Number(view.container.querySelector('[data-testid="mock-route-progress"]')?.textContent ?? "0");
    expect(autoplayProgress).toBeGreaterThan(0);

    clickByText(view.container, "Cycling");
    await view.flush();

    expect(view.container.querySelector('[data-testid="mock-route-profile"]')?.textContent).toBe("cycling");
    expect(view.container.querySelector('[data-testid="mock-route-playback-mode"]')?.textContent).toBe("autoplay");
    expect(view.container.querySelector('[data-testid="mock-route-progress"]')?.textContent).toBe("0.000");

    view.unmount();
  });

  test("autoplay keeps looping instead of stopping after one pass", async () => {
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
    await view.flushTimers(12450);

    expect(view.container.querySelector('[data-testid="mock-route-playback-mode"]')?.textContent).toBe("autoplay");
    expect(Number(view.container.querySelector('[data-testid="mock-route-progress"]')?.textContent ?? "1")).toBeLessThan(0.1);

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
    expect(legendPanel?.className).toContain("overflow-y-scroll");

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

  test("switches to live tracking mode and maps the user's real position onto the current route", async () => {
    let watchSuccess: PositionCallback | null = null;
    const watchPositionMock = vi.fn((success: PositionCallback) => {
      watchSuccess = success;
      return 9;
    });
    const clearWatchMock = vi.fn();

    vi.stubGlobal("navigator", {
      ...window.navigator,
      geolocation: {
        getCurrentPosition: vi.fn(),
        watchPosition: watchPositionMock,
        clearWatch: clearWatchMock,
      },
    });

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

    const liveButton = view.container.querySelector('button[aria-label="Track my live route progress"]');
    expect(liveButton).toBeTruthy();

    act(() => {
      liveButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(watchPositionMock).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector('[data-testid="mock-route-playback-mode"]')?.textContent).toBe("live");
    expect(view.container.querySelector('[data-testid="mock-follow-pet"]')?.textContent).toBe("true");

    act(() => {
      watchSuccess?.({
        coords: {
          latitude: -37.8079,
          longitude: 144.9728,
          accuracy: 18,
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

    const liveProgress = Number(view.container.querySelector('[data-testid="mock-route-progress"]')?.textContent ?? "0");
    expect(liveProgress).toBeGreaterThan(0.2);
    expect(view.container.querySelector('[data-testid="mock-live-tracked-point"]')?.textContent).toBe("-37.8079,144.9728");
    expect(view.container.textContent).toContain("Live route progress is tracking your current location");

    view.unmount();
    expect(clearWatchMock).toHaveBeenCalledWith(9);
  });

  test("clicking the live tracking button again turns tracking off and restarts autoplay", async () => {
    let watchSuccess: PositionCallback | null = null;
    const watchPositionMock = vi.fn((success: PositionCallback) => {
      watchSuccess = success;
      return 17;
    });
    const clearWatchMock = vi.fn();

    vi.stubGlobal("navigator", {
      ...window.navigator,
      geolocation: {
        getCurrentPosition: vi.fn(),
        watchPosition: watchPositionMock,
        clearWatch: clearWatchMock,
      },
    });

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

    const liveButton = () => view.container.querySelector('button[aria-label="Track my live route progress"], button[aria-label="Stop live route progress"]');
    expect(liveButton()).toBeTruthy();

    act(() => {
      liveButton()!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    act(() => {
      watchSuccess?.({
        coords: {
          latitude: -37.8079,
          longitude: 144.9728,
          accuracy: 18,
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

    expect(view.container.querySelector('[data-testid="mock-route-playback-mode"]')?.textContent).toBe("live");

    act(() => {
      liveButton()!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(clearWatchMock).toHaveBeenCalledWith(17);
    expect(view.container.querySelector('[data-testid="mock-route-playback-mode"]')?.textContent).toBe("autoplay");
    expect(view.container.querySelector('[data-testid="mock-route-progress"]')?.textContent).toBe("0.000");

    view.unmount();
  });

  test("autoplay pauses briefly at the route end before looping back to the start", async () => {
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

    await view.flushTimers(11000);
    expect(view.container.querySelector('[data-testid="mock-route-progress"]')?.textContent).toBe("1.000");

    await view.flushTimers(800);
    expect(view.container.querySelector('[data-testid="mock-route-progress"]')?.textContent).toBe("1.000");

    await view.flushTimers(450);
    expect(Number(view.container.querySelector('[data-testid="mock-route-progress"]')?.textContent ?? "1")).toBeLessThan(0.1);

    view.unmount();
  });

  test("live tracking can suggest rerouting when the current location is far from the selected start point", async () => {
    let watchSuccess: PositionCallback | null = null;
    const watchPositionMock = vi.fn((success: PositionCallback) => {
      watchSuccess = success;
      return 21;
    });
    const clearWatchMock = vi.fn();

    vi.stubGlobal("navigator", {
      ...window.navigator,
      geolocation: {
        getCurrentPosition: vi.fn(),
        watchPosition: watchPositionMock,
        clearWatch: clearWatchMock,
      },
    });

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

    const liveButton = view.container.querySelector('button[aria-label="Track my live route progress"]');
    expect(liveButton).toBeTruthy();

    act(() => {
      liveButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    act(() => {
      watchSuccess?.({
        coords: {
          latitude: -37.7001,
          longitude: 145.1201,
          accuracy: 16,
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

    expect(view.container.textContent).toContain("You are far from the selected start point");
    expect(view.container.textContent).toContain("Re-route from my location");
    expect(view.container.textContent).toContain("Keep current route");

    clickByText(view.container, "Re-route from my location");
    await view.flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("145.1201,-37.7001");
    expect(view.container.querySelector('[data-testid="mock-route-playback-mode"]')?.textContent).toBe("live");

    view.unmount();
    expect(clearWatchMock).toHaveBeenCalledWith(21);
  });

  test("live tracking errors fall back gracefully without clearing the route", async () => {
    const watchPositionMock = vi.fn((_success: PositionCallback, error?: PositionErrorCallback) => {
      error?.({
        code: 1,
        message: "permission denied",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
      return 13;
    });
    const clearWatchMock = vi.fn();

    vi.stubGlobal("navigator", {
      ...window.navigator,
      geolocation: {
        getCurrentPosition: vi.fn(),
        watchPosition: watchPositionMock,
        clearWatch: clearWatchMock,
      },
    });

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

    const liveButton = view.container.querySelector('button[aria-label="Track my live route progress"]');
    expect(liveButton).toBeTruthy();

    act(() => {
      liveButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.querySelector('[data-testid="mock-route-profile"]')?.textContent).toBe("walking");
    expect(view.container.querySelector('[data-testid="mock-route-playback-mode"]')?.textContent).toBe("idle");
    expect(view.container.textContent).toContain("Live route tracking could not start");
    expect(view.container.textContent).toContain("Location permission was denied");

    view.unmount();
    expect(clearWatchMock).toHaveBeenCalledWith(13);
  });

  test("ignores out-of-bound search parameters and does not request a route for points outside Australia", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => createRouteResponse("walking"),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const Map3DExperimentPage = await loadPageWithToken();
    const view = render(
      <MemoryRouter
        initialEntries={[
          "/map/3d-route?startLat=-37.81140&startLng=144.95420&endLat=1.35210&endLng=103.81980",
        ]}
      >
        <Routes>
          <Route path="/map/3d-route" element={<Map3DExperimentPage />} />
        </Routes>
      </MemoryRouter>
    );

    await view.flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("Outside supported area");
    expect(view.container.textContent).toContain("Only locations inside Australia");
    expect(view.container.textContent).toContain("-37.81140, 144.95420");
    expect(view.container.textContent).toContain("Not selected");

    view.unmount();
  });

  test("auto guide shows only once per runtime and can appear again after a reload", async () => {
    const FirstLoadPage = await loadPageWithToken();
    const firstView = render(
      <MemoryRouter initialEntries={["/map/3d-route"]}>
        <Routes>
          <Route path="/map/3d-route" element={<FirstLoadPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(firstView.container.textContent).toContain("Tips Guide");
    expect(firstView.container.textContent).toContain("Step 1 of 4");
    expect(firstView.container.textContent).toContain("Choose your route points");
    expect(firstView.container.querySelector('[data-testid="route-guide-overlay"]')?.className).toContain(
      "overflow-hidden"
    );
    expect(firstView.container.querySelector('[data-testid="route-guide-step-card"]')?.className).toContain(
      "route-guide-glass-card"
    );
    expect(firstView.container.querySelector('[data-testid="route-guide-body-card"]')?.className).toContain(
      "route-guide-glass-panel"
    );
    expect(firstView.container.querySelector('[data-testid="route-guide-next-button"]')?.className).toContain(
      "route-guide-glass-button"
    );
    firstView.unmount();

    const secondView = render(
      <MemoryRouter initialEntries={["/map/3d-route"]}>
        <Routes>
          <Route path="/map/3d-route" element={<FirstLoadPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(secondView.container.textContent).not.toContain("This guide appears only the first time");
    secondView.unmount();

    const ReloadedPage = await loadPageWithToken();
    const reloadedView = render(
      <MemoryRouter initialEntries={["/map/3d-route"]}>
        <Routes>
          <Route path="/map/3d-route" element={<ReloadedPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(reloadedView.container.textContent).toContain("Tips Guide");
    reloadedView.unmount();
  });

  test("3D route guide explains live tracking, pet movement, reroute prompt, and autoplay resume", async () => {
    const Map3DExperimentPage = await loadPageWithToken();
    const view = render(
      <MemoryRouter initialEntries={["/map/3d-route"]}>
        <Routes>
          <Route path="/map/3d-route" element={<Map3DExperimentPage />} />
        </Routes>
      </MemoryRouter>
    );

    const nextButton = () => view.container.querySelector('[data-testid="route-guide-next-button"]');

    expect(view.container.textContent).toContain("Choose your route points");

    act(() => {
      nextButton()!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(view.container.textContent).toContain("Read the route summary quickly");

    act(() => {
      nextButton()!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(view.container.textContent).toContain("Use map controls without losing context");

    act(() => {
      nextButton()!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.textContent).toContain("Refine the route when needed");
    expect(view.container.textContent).toContain("Track live route progress");
    expect(view.container.textContent).toContain("pet");
    expect(view.container.textContent).toContain("current location");
    expect(view.container.textContent).toContain("selected start point");
    expect(view.container.textContent).toContain("re-route");
    expect(view.container.textContent).toContain("same destination");
    expect(view.container.textContent).toContain("Auto playback");

    view.unmount();
  });

  test("mobile collapsed state hides the floating side panel and keeps panel launchers in the top bar", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true,
        media: "(max-width: 767px)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const Map3DExperimentPage = await loadPageWithToken();
    const view = render(
      <MemoryRouter initialEntries={["/map/3d-route"]}>
        <Routes>
          <Route path="/map/3d-route" element={<Map3DExperimentPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(view.container.querySelector('[data-testid="collapsed-panel-actions"]')).toBeNull();
    expect(view.container.textContent).toContain("Route");
    expect(view.container.textContent).toContain("Layers");
    expect(view.container.querySelector('[data-testid="route-top-toolbar"]')?.className).not.toContain("max-sm:flex-wrap");
    expect(view.container.querySelector('[data-testid="route-mobile-zoom-rail"]')).toBeNull();
    expect(view.container.querySelector('button[aria-label="Zoom in"]')).toBeNull();
    expect(view.container.querySelector('button[aria-label="Zoom out"]')).toBeNull();

    const routeButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Route"
    );
    expect(routeButton).toBeDefined();

    await act(async () => {
      routeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.querySelector('[data-testid="route-mobile-sheet-handle"]')).not.toBeNull();

    view.unmount();
  });

  test("area comfort-route navigation preloads both start and end points and requests a route immediately", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => ({
      ok: true,
      json: async () => createRouteResponse(String(input).includes("/cycling/") ? "cycling" : "walking"),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const Map3DExperimentPage = await loadPageWithToken();
    const view = render(
      <MemoryRouter
        initialEntries={[
          "/map/3d-route?startLat=-37.81140&startLng=144.95420&endLat=-37.80760&endLng=144.95680&routeName=Flagstaff%20Gardens%20to%20Queen%20Victoria%20Market",
        ]}
      >
        <Routes>
          <Route path="/map/3d-route" element={<Map3DExperimentPage />} />
        </Routes>
      </MemoryRouter>
    );

    await view.flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("144.9542,-37.8114;144.9568,-37.8076");
    expect(view.container.textContent).toContain("-37.81140, 144.95420");
    expect(view.container.textContent).toContain("-37.80760, 144.95680");
    expect(view.container.querySelector('[data-testid="mock-route-profile"]')?.textContent).toBe("walking");
    expect(latestMapProps?.route?.geometry.coordinates.length).toBeGreaterThan(0);

    view.unmount();
  });
});
