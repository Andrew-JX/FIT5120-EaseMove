import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

type Listener = (...args: any[]) => void;

const mapInstances: MockMap[] = [];
const markerInstances: MockMarker[] = [];

class MockLngLatBounds {
  points: [number, number][] = [];

  extend(point: [number, number]) {
    this.points.push(point);
    return this;
  }
}

class MockMarker {
  options: { element: HTMLElement; anchor: string };
  lngLat: [number, number] | null = null;
  addedTo: MockMap | null = null;
  removed = false;

  constructor(options: { element: HTMLElement; anchor: string }) {
    this.options = options;
    markerInstances.push(this);
  }

  setLngLat(lngLat: [number, number]) {
    this.lngLat = lngLat;
    return this;
  }

  addTo(map: MockMap) {
    this.addedTo = map;
    return this;
  }

  remove() {
    this.removed = true;
    return this;
  }
}

class MockPopup {
  remove() {
    return this;
  }
  setLngLat() {
    return this;
  }
  setHTML() {
    return this;
  }
  addTo() {
    return this;
  }
}

class MockMap {
  options: Record<string, unknown>;
  handlers = new Map<string, Listener[]>();
  onceHandlers = new Map<string, Listener[]>();
  layers = new Map<string, any>();
  sources = new Map<string, any>();
  fitBounds = vi.fn();
  easeTo = vi.fn();
  addLayer = vi.fn((layer: any) => {
    this.layers.set(layer.id, layer);
    return this;
  });
  addSource = vi.fn((id: string, source: any) => {
    this.sources.set(id, {
      ...source,
      setData: vi.fn(),
    });
    return this;
  });
  getSource = vi.fn((id: string) => this.sources.get(id));
  getLayer = vi.fn((id: string) => this.layers.get(id));
  moveLayer = vi.fn();
  removeLayer = vi.fn((id: string) => {
    this.layers.delete(id);
    return this;
  });
  removeSource = vi.fn((id: string) => {
    this.sources.delete(id);
    return this;
  });
  setPaintProperty = vi.fn();
  setLayoutProperty = vi.fn();
  setConfigProperty = vi.fn();
  addControl = vi.fn();
  remove = vi.fn();
  queryRenderedFeatures = vi.fn(() => []);
  isStyleLoaded = vi.fn(() => true);
  getStyle = vi.fn(() => ({ layers: [] }));
  getZoom = vi.fn(() => 15.6);
  getCanvas = vi.fn(() => ({ style: { touchAction: "", cursor: "" } }));
  getContainer = vi.fn(() => ({ style: { touchAction: "" }, clientWidth: 1200, clientHeight: 800 }));
  project = vi.fn((lngLat: { lng: number; lat: number } | [number, number]) => {
    const lng = Array.isArray(lngLat) ? lngLat[0] : lngLat.lng;
    const lat = Array.isArray(lngLat) ? lngLat[1] : lngLat.lat;
    return {
      x: 600 + (lng - 144.9631) * 10000,
      y: 400 + (lat + 37.8136) * -10000,
    };
  });
  dragPan = { enable: vi.fn() };
  dragRotate = { enable: vi.fn() };
  touchZoomRotate = { enable: vi.fn(), enableRotation: vi.fn() };
  touchPitch = { enable: vi.fn() };

  constructor(options: Record<string, unknown> = {}) {
    this.options = options;
    mapInstances.push(this);
  }

  on(event: string, handler: Listener) {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
    return this;
  }

  once(event: string, handler: Listener) {
    const list = this.onceHandlers.get(event) ?? [];
    list.push(handler);
    this.onceHandlers.set(event, list);
    return this;
  }

  off(event: string, handler: Listener) {
    const handlers = this.handlers.get(event) ?? [];
    this.handlers.set(event, handlers.filter((candidate) => candidate !== handler));
    const onceHandlers = this.onceHandlers.get(event) ?? [];
    this.onceHandlers.set(event, onceHandlers.filter((candidate) => candidate !== handler));
    return this;
  }

  trigger(event: string, ...args: any[]) {
    for (const handler of this.handlers.get(event) ?? []) handler(...args);
    const once = this.onceHandlers.get(event) ?? [];
    this.onceHandlers.delete(event);
    for (const handler of once) handler(...args);
  }
}

vi.mock("mapbox-gl", () => ({
  default: {
    Map: MockMap,
    Marker: MockMarker,
    Popup: MockPopup,
    NavigationControl: class {},
    LngLatBounds: MockLngLatBounds,
    accessToken: "",
  },
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
    rerender(nextElement: React.ReactNode) {
      act(() => {
        root.render(nextElement);
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

const WATERBODY_FIXTURE: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        NAME_LABEL: "Test Harbour",
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [144.949, -37.8216],
          [144.9528, -37.8216],
          [144.9528, -37.8192],
          [144.949, -37.8192],
          [144.949, -37.8216],
        ]],
      },
    },
  ],
};

beforeEach(() => {
  mapInstances.length = 0;
  markerInstances.length = 0;
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ features: [] }) })));
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("WhiteModelMap", () => {
  test("blocks clicks that land inside waterbodies and reports a land-only routing hint", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/geoscape/waterbodies.geojson")) {
        return {
          ok: true,
          json: async () => WATERBODY_FIXTURE,
        };
      }
      return {
        ok: true,
        json: async () => ({ features: [] }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const module = await import("../WhiteModelMap");
    const WhiteModelMap = module.default;
    const onMapClick = vi.fn();
    const onMapError = vi.fn();
    const onBlockedPointSelection = vi.fn();

    const view = render(
      <WhiteModelMap
        mapboxToken="token"
        startPoint={null}
        endPoint={null}
        route={null}
        routeProgress={null}
        routePlaybackMode="idle"
        followPet={false}
        focusedStep={null}
        showEasePlaces={false}
        showNaturalPlaces={false}
        showStreetFacilities={false}
        onMapClick={onMapClick}
        onMapError={onMapError}
        onBlockedPointSelection={onBlockedPointSelection}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    const map = mapInstances[0];
    expect(map).toBeTruthy();

    act(() => {
      map.trigger("click", {
        point: { x: 100, y: 120 },
        lngLat: { lng: 144.9511, lat: -37.8204 },
      });
    });

    expect(fetchMock).toHaveBeenCalledWith("/geoscape/waterbodies.geojson");
    expect(onMapClick).not.toHaveBeenCalled();
    expect(onMapError).not.toHaveBeenCalled();
    expect(onBlockedPointSelection).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "waterbody",
        attemptedPoint: { lng: 144.9511, lat: -37.8204 },
        suggestedPoint: expect.objectContaining({
          lng: expect.any(Number),
          lat: expect.any(Number),
        }),
        distanceMeters: expect.any(Number),
      })
    );

    view.unmount();
  });

  test("falls back to rendered map water features when the local waterbody file does not cover the clicked harbor area", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ type: "FeatureCollection", features: [] }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const module = await import("../WhiteModelMap");
    const WhiteModelMap = module.default;
    const onMapClick = vi.fn();
    const onBlockedPointSelection = vi.fn();

    const view = render(
      <WhiteModelMap
        mapboxToken="token"
        startPoint={null}
        endPoint={null}
        route={null}
        routeProgress={null}
        routePlaybackMode="idle"
        followPet={false}
        focusedStep={null}
        showEasePlaces={false}
        showNaturalPlaces={false}
        showStreetFacilities={false}
        onMapClick={onMapClick}
        onMapError={vi.fn()}
        onBlockedPointSelection={onBlockedPointSelection}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    const map = mapInstances[0];
    expect(map).toBeTruthy();

    map.queryRenderedFeatures = vi.fn((_, options?: { layers?: string[] }) => {
      if (options?.layers?.includes("ease-places-hit-area-3d")) return [];
      if (options?.layers?.includes("street-facilities-hit-area-3d")) return [];
      return [
        {
          geometry: {
            type: "Polygon",
            coordinates: [[
              [144.949, -37.8216],
              [144.9528, -37.8216],
              [144.9528, -37.8192],
              [144.949, -37.8192],
              [144.949, -37.8216],
            ]],
          },
          layer: { id: "water" },
          properties: { class: "water" },
          source: "composite",
          sourceLayer: "water",
        },
      ];
    });

    act(() => {
      map.trigger("click", {
        point: { x: 100, y: 120 },
        lngLat: { lng: 144.9511, lat: -37.8204 },
      });
    });

    expect(onMapClick).not.toHaveBeenCalled();
    expect(onBlockedPointSelection).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "waterbody",
        attemptedPoint: { lng: 144.9511, lat: -37.8204 },
      })
    );

    view.unmount();
  });

  test("can disable the default mapbox navigation control and expose viewport controls", async () => {
    const module = await import("../WhiteModelMap");
    const WhiteModelMap = module.default;
    const onViewportControlsReady = vi.fn();

    const view = render(
      <WhiteModelMap
        mapboxToken="token"
        startPoint={null}
        endPoint={null}
        route={null}
        routeProgress={null}
        routePlaybackMode="idle"
        followPet={false}
        focusedStep={null}
        showEasePlaces={false}
        showNaturalPlaces={false}
        showStreetFacilities={false}
        showNavigationControl={false}
        onMapClick={vi.fn()}
        onMapError={vi.fn()}
        onViewportControlsReady={onViewportControlsReady}
      />
    );

    const map = mapInstances[0];
    expect(map).toBeTruthy();
    expect(map.addControl).not.toHaveBeenCalled();
    expect(onViewportControlsReady).toHaveBeenCalledWith(
      expect.objectContaining({
        zoomIn: expect.any(Function),
        zoomOut: expect.any(Function),
      })
    );

    view.unmount();

    expect(onViewportControlsReady).toHaveBeenLastCalledWith(null);
  });

  test("preloaded routes are focused from the start point and route styling stays visually prominent", async () => {
    const module = await import("../WhiteModelMap");
    const WhiteModelMap = module.default;

    const route = {
      distanceMeters: 1200,
      durationSeconds: 780,
      steps: [],
      profile: "walking" as const,
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [144.9542, -37.8114],
          [144.9552, -37.8108],
          [144.9568, -37.8076],
        ],
      },
    };

    const view = render(
      <WhiteModelMap
        mapboxToken="token"
        startPoint={{ lng: 144.9542, lat: -37.8114 }}
        endPoint={{ lng: 144.9568, lat: -37.8076 }}
        route={route}
        routeProgress={null}
        routePlaybackMode="idle"
        followPet={false}
        focusedStep={null}
        showEasePlaces={false}
        showNaturalPlaces={false}
        showStreetFacilities={false}
        onMapClick={vi.fn()}
        onMapError={vi.fn()}
      />
    );

    const map = mapInstances[0];
    expect(map).toBeTruthy();

    act(() => {
      map.trigger("style.load");
      map.trigger("idle");
    });

    expect(map.fitBounds).toHaveBeenCalled();
    expect(map.easeTo).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [144.9542, -37.8114],
      })
    );

    const routeLayer = map.layers.get("route-line");
    const routeCasingLayer = map.layers.get("route-line-casing");
    expect(routeLayer?.paint?.["line-width"]).toBeGreaterThanOrEqual(7);
    expect(routeCasingLayer?.paint?.["line-width"]).toBeGreaterThanOrEqual(14);

    const startMarker = markerInstances.find((marker) => marker.options.element.textContent === "S");
    const endMarker = markerInstances.find((marker) => marker.options.element.textContent === "E");
    expect(startMarker?.options.element.style.width).toBe("38px");
    expect(endMarker?.options.element.style.width).toBe("38px");

    view.unmount();
  });

  test("registers upgraded park highlight layers without changing route behavior", async () => {
    const module = await import("../WhiteModelMap");
    const WhiteModelMap = module.default;

    const view = render(
      <WhiteModelMap
        mapboxToken="token"
        startPoint={null}
        endPoint={null}
        route={null}
        routeProgress={null}
        routePlaybackMode="idle"
        followPet={false}
        focusedStep={null}
        showEasePlaces={false}
        showNaturalPlaces={true}
        showStreetFacilities={false}
        onMapClick={vi.fn()}
        onMapError={vi.fn()}
      />
    );

    const map = mapInstances[0];
    expect(map).toBeTruthy();

    act(() => {
      map.trigger("style.load");
    });

    expect(map.layers.has("parks-fill-base-3d")).toBe(true);
    expect(map.layers.has("parks-fill-glow-3d")).toBe(true);
    expect(map.layers.has("parks-line-3d")).toBe(true);

    view.unmount();
  });

  test("loads Mapbox Standard with 3D building details enabled and no custom white-model building layer", async () => {
    const module = await import("../WhiteModelMap");
    const WhiteModelMap = module.default;

    const view = render(
      <WhiteModelMap
        mapboxToken="token"
        startPoint={null}
        endPoint={null}
        route={null}
        routeProgress={null}
        routePlaybackMode="idle"
        followPet={false}
        focusedStep={null}
        showEasePlaces={false}
        showNaturalPlaces={false}
        showStreetFacilities={false}
        onMapClick={vi.fn()}
        onMapError={vi.fn()}
      />
    );

    const map = mapInstances[0];
    expect(map).toBeTruthy();
    expect(map.options.style).toBe("mapbox://styles/mapbox/standard");
    expect(map.options.config).toEqual({
      basemap: expect.objectContaining({
        lightPreset: "day",
        show3dObjects: true,
        show3dBuildings: true,
        show3dLandmarks: true,
        show3dTrees: true,
        show3dFacades: true,
      }),
    });

    act(() => {
      map.trigger("style.load");
    });

    expect(map.setConfigProperty).toHaveBeenCalledWith("basemap", "show3dFacades", true);
    expect(map.layers.has("white-model-buildings")).toBe(false);

    view.unmount();
  });

  test("updates the route source and places a stable pet marker on the active point", async () => {
    const module = await import("../WhiteModelMap");
    const WhiteModelMap = module.default;

    const route = {
      distanceMeters: 1200,
      durationSeconds: 780,
      steps: [],
      profile: "walking" as const,
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [144.9542, -37.8114],
          [144.9552, -37.8108],
          [144.9568, -37.8076],
        ],
      },
    };

    const view = render(
      <WhiteModelMap
        mapboxToken="token"
        startPoint={{ lng: 144.9542, lat: -37.8114 }}
        endPoint={{ lng: 144.9568, lat: -37.8076 }}
        route={route}
        routeProgress={0.5}
        routePlaybackMode="autoplay"
        followPet={false}
        focusedStep={null}
        showEasePlaces={false}
        showNaturalPlaces={false}
        showStreetFacilities={false}
        onMapClick={vi.fn()}
        onMapError={vi.fn()}
      />
    );

    const map = mapInstances[0];
    expect(map).toBeTruthy();

    act(() => {
      map.trigger("style.load");
      map.trigger("idle");
    });

    const routeSource = map.sources.get("route");
    expect(routeSource).toBeTruthy();
    expect(routeSource.setData).toHaveBeenCalled();

    const petMarker = markerInstances.find((marker) => marker.options.element.getAttribute("data-testid") === "route-pet-marker");
    expect(petMarker).toBeTruthy();
    expect(petMarker?.lngLat).not.toEqual([144.9542, -37.8114]);
    expect(petMarker?.lngLat).not.toEqual([144.9568, -37.8076]);
    expect(petMarker?.options.element.getAttribute("data-pet-mode")).toBe("spritesheet");

    view.unmount();
  });

  test("keeps the live tracked pet marker stable in live mode", async () => {
    const module = await import("../WhiteModelMap");
    const WhiteModelMap = module.default;

    const route = {
      distanceMeters: 1200,
      durationSeconds: 780,
      steps: [],
      profile: "walking" as const,
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [144.9542, -37.8114],
          [144.9552, -37.8108],
          [144.9568, -37.8076],
        ],
      },
    };

    const view = render(
      <WhiteModelMap
        mapboxToken="token"
        startPoint={{ lng: 144.9542, lat: -37.8114 }}
        endPoint={{ lng: 144.9568, lat: -37.8076 }}
        route={route}
        routeProgress={0.5}
        routePlaybackMode="live"
        followPet={true}
        liveTrackedPoint={{ lng: 144.9552, lat: -37.8108 }}
        focusedStep={null}
        showEasePlaces={false}
        showNaturalPlaces={false}
        showStreetFacilities={false}
        onMapClick={vi.fn()}
        onMapError={vi.fn()}
      />
    );

    const map = mapInstances[0];
    expect(map).toBeTruthy();

    act(() => {
      map.trigger("style.load");
      map.trigger("idle");
    });

    const petMarker = markerInstances.find((marker) => marker.options.element.getAttribute("data-testid") === "route-pet-marker");
    expect(petMarker?.options.element.getAttribute("data-pet-mode")).toBe("spritesheet");
    expect(petMarker?.lngLat).toEqual([144.9552, -37.8108]);

    act(() => {
      view.unmount();
    });
  });

  test("pauses pet marker updates during direct map interactions and catches up afterwards", async () => {
    const module = await import("../WhiteModelMap");
    const WhiteModelMap = module.default;

    const route = {
      distanceMeters: 1200,
      durationSeconds: 780,
      steps: [],
      profile: "walking" as const,
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [144.9542, -37.8114],
          [144.9552, -37.8108],
          [144.9568, -37.8076],
        ],
      },
    };

    const view = render(
      <WhiteModelMap
        mapboxToken="token"
        startPoint={{ lng: 144.9542, lat: -37.8114 }}
        endPoint={{ lng: 144.9568, lat: -37.8076 }}
        route={route}
        routeProgress={0.2}
        routePlaybackMode="autoplay"
        followPet={false}
        focusedStep={null}
        showEasePlaces={false}
        showNaturalPlaces={false}
        showStreetFacilities={false}
        onMapClick={vi.fn()}
        onMapError={vi.fn()}
      />
    );

    const map = mapInstances[0];
    expect(map).toBeTruthy();

    act(() => {
      map.trigger("style.load");
      map.trigger("idle");
    });

    const petMarker = markerInstances.find((marker) => marker.options.element.getAttribute("data-testid") === "route-pet-marker");
    expect(petMarker?.lngLat).toBeTruthy();
    const initialLngLat = petMarker?.lngLat ? [...petMarker.lngLat] : null;

    act(() => {
      map.trigger("movestart");
    });

    view.rerender(
      <WhiteModelMap
        mapboxToken="token"
        startPoint={{ lng: 144.9542, lat: -37.8114 }}
        endPoint={{ lng: 144.9568, lat: -37.8076 }}
        route={route}
        routeProgress={0.7}
        routePlaybackMode="autoplay"
        followPet={false}
        focusedStep={null}
        showEasePlaces={false}
        showNaturalPlaces={false}
        showStreetFacilities={false}
        onMapClick={vi.fn()}
        onMapError={vi.fn()}
      />
    );

    expect(petMarker?.lngLat).toEqual(initialLngLat);

    act(() => {
      map.trigger("moveend");
    });

    expect(petMarker?.lngLat).not.toEqual(initialLngLat);

    view.unmount();
  });

});
