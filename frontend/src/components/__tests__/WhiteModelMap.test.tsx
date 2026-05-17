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
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

beforeEach(() => {
  mapInstances.length = 0;
  markerInstances.length = 0;
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ features: [] }) })));
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("WhiteModelMap", () => {
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

});
