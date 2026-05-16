import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { EASE_PLACES_DATA, easePlacesMarkerColor, type EasePlacesFeature } from "../lib/easePlaces";
import {
  classifySupportedFacility,
  fetchSupportedFacilitiesCatalog,
  getSupportedFacilityTypeLabel,
  type SupportedFacilityKind,
} from "../lib/streetFacilities";

export const MELBOURNE_CENTER: [number, number] = [144.9631, -37.8136];

const LABEL_SOURCE_LAYER_PATTERNS = /(road|street|place|poi|transit|station|natural|landmark)/i;
const LABEL_ID_PATTERNS = /(road|street|place|poi|transit|station|label|natural|park|water|settlement)/i;

const SOURCE_IDS = {
  route: "route",
  parks: "parks-3d",
  waterbodies: "waterbodies-3d",
  easePlaces: "ease-places-3d",
  streetFacilities: "street-facilities-3d",
} as const;

const LAYER_IDS = {
  routeCasing: "route-line-casing",
  route: "route-line",
  parksFillBase: "parks-fill-base-3d",
  parksFillGlow: "parks-fill-glow-3d",
  parksLine: "parks-line-3d",
  waterFill: "waterbodies-fill-3d",
  waterLine: "waterbodies-line-3d",
  easePlacesHalo: "ease-places-halo-3d",
  easePlacesCircle: "ease-places-circle-3d",
  easePlacesHitArea: "ease-places-hit-area-3d",
  streetFacilitiesCircle: "street-facilities-circle-3d",
  streetFacilitiesHitArea: "street-facilities-hit-area-3d",
  buildings: "white-model-buildings",
} as const;

function visibilityLayout(visible: boolean) {
  return { visibility: visible ? "visible" : "none" } as const;
}

type FeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>;

export type RouteProfile = "walking" | "cycling";

export type RoutePoint = {
  lng: number;
  lat: number;
};

export type RouteStepItem = {
  instruction: string;
  modifier: string | null;
  type: string;
  distanceMeters: number;
  roadName: string;
  maneuverPoint: RoutePoint | null;
};

export type RouteSummary = {
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteStepItem[];
  profile: RouteProfile;
  geometry: GeoJSON.LineString;
};

export type MapViewportControls = {
  zoomIn: () => void;
  zoomOut: () => void;
};

type WhiteModelMapProps = {
  mapboxToken: string | null;
  startPoint: RoutePoint | null;
  endPoint: RoutePoint | null;
  route: RouteSummary | null;
  focusedStep: RouteStepItem | null;
  showEasePlaces: boolean;
  showNaturalPlaces: boolean;
  showStreetFacilities: boolean;
  showNavigationControl?: boolean;
  onMapClick: (point: RoutePoint) => void;
  onMapError: (message: string) => void;
  onViewportControlsReady?: (controls: MapViewportControls | null) => void;
  onEasePlaceSelect?: (
    feature: EasePlacesFeature,
    point: { x: number; y: number },
    viewport: { width: number; height: number }
  ) => void;
};

function facilityStyle(kind: SupportedFacilityKind): {
  label: string;
  color: string;
  halo: string;
} {
  if (kind === "bicycle") {
    return { label: getSupportedFacilityTypeLabel(kind), color: "#c2410c", halo: "rgba(194,65,12,0.2)" };
  }
  if (kind === "drinking") {
    return { label: getSupportedFacilityTypeLabel(kind), color: "#0891b2", halo: "rgba(8,145,178,0.2)" };
  }
  return { label: getSupportedFacilityTypeLabel(kind), color: "#7e22ce", halo: "rgba(126,34,206,0.2)" };
}

function toLngLat(point: RoutePoint): [number, number] {
  return [point.lng, point.lat];
}

function toFeatureCollection(features: GeoJSON.Feature[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features,
  };
}

function createMarkerElement(color: string, label: string) {
  const el = document.createElement("div");
  el.style.width = "38px";
  el.style.height = "38px";
  el.style.borderRadius = "999px";
  el.style.border = "5px solid white";
  el.style.boxShadow = "0 0 0 8px rgba(255,255,255,0.28), 0 0 0 16px rgba(255,255,255,0.1), 0 22px 40px rgba(15, 23, 42, 0.42)";
  el.style.background = color;
  el.style.display = "grid";
  el.style.placeItems = "center";
  el.style.color = "white";
  el.style.fontSize = "15px";
  el.style.fontWeight = "900";
  el.style.lineHeight = "1";
  el.style.textShadow = "0 1px 2px rgba(0,0,0,0.3)";
  el.textContent = label;
  el.title = label === "S" ? "Start point" : "End point";
  return el;
}

function createFocusMarkerElement() {
  const wrapper = document.createElement("div");
  wrapper.style.width = "28px";
  wrapper.style.height = "28px";
  wrapper.style.display = "grid";
  wrapper.style.placeItems = "center";

  const halo = document.createElement("div");
  halo.style.width = "28px";
  halo.style.height = "28px";
  halo.style.borderRadius = "999px";
  halo.style.background = "rgba(15, 118, 110, 0.18)";
  halo.style.border = "2px solid rgba(15, 118, 110, 0.28)";
  halo.style.boxShadow = "0 0 0 8px rgba(15, 118, 110, 0.12)";
  halo.style.display = "grid";
  halo.style.placeItems = "center";

  const dot = document.createElement("div");
  dot.style.width = "12px";
  dot.style.height = "12px";
  dot.style.borderRadius = "999px";
  dot.style.background = "#0f766e";
  dot.style.border = "2px solid #f8fafc";
  dot.style.boxShadow = "0 10px 24px rgba(15, 118, 110, 0.28)";

  halo.appendChild(dot);
  wrapper.appendChild(halo);
  return wrapper;
}

function easePlacesToFeatureCollection(): FeatureCollection {
  return toFeatureCollection(
    EASE_PLACES_DATA.map((feature) => {
      const { core, halo } = easePlacesMarkerColor(feature.category);
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [feature.lng, feature.lat],
        },
        properties: {
          id: feature.id,
          name: feature.name,
          category: feature.category,
          type: feature.type,
          coreColor: core,
          haloColor: halo,
        },
      } satisfies GeoJSON.Feature<GeoJSON.Point>;
    })
  );
}

export default function WhiteModelMap({
  mapboxToken,
  startPoint,
  endPoint,
  route,
  focusedStep,
  showEasePlaces,
  showNaturalPlaces,
  showStreetFacilities,
  showNavigationControl = true,
  onMapClick,
  onMapError,
  onViewportControlsReady,
  onEasePlaceSelect,
}: WhiteModelMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const endMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const focusedStepMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const naturalPopupRef = useRef<mapboxgl.Popup | null>(null);
  const easePlacesPopupRef = useRef<mapboxgl.Popup | null>(null);
  const streetFacilitiesPopupRef = useRef<mapboxgl.Popup | null>(null);
  const parksDataRef = useRef<FeatureCollection | null>(null);
  const waterDataRef = useRef<FeatureCollection | null>(null);
  const streetFacilitiesDataRef = useRef<FeatureCollection | null>(null);
  const onMapClickRef = useRef(onMapClick);
  const onMapErrorRef = useRef(onMapError);
  const onViewportControlsReadyRef = useRef(onViewportControlsReady);
  const onEasePlaceSelectRef = useRef(onEasePlaceSelect);
  const routeRef = useRef(route);
  const hasFocusedInitialRouteRef = useRef(false);
  const showEasePlacesRef = useRef(showEasePlaces);
  const showNaturalPlacesRef = useRef(showNaturalPlaces);
  const showStreetFacilitiesRef = useRef(showStreetFacilities);

  const removePopup = (popupRef: { current: mapboxgl.Popup | null }) => {
    popupRef.current?.remove();
    popupRef.current = null;
  };

  const updateSource = (id: string, data: FeatureCollection) => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource(id) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
    }
  };

  const setLayerVisibility = (layerIds: string[], visible: boolean) => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    for (const layerId of layerIds) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
      }
    }
  };

  const ensureRouteOnTop = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (map.getLayer(LAYER_IDS.routeCasing)) map.moveLayer(LAYER_IDS.routeCasing);
    if (map.getLayer(LAYER_IDS.route)) map.moveLayer(LAYER_IDS.route);
  };

  const removeRoute = () => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer(LAYER_IDS.route)) map.removeLayer(LAYER_IDS.route);
    if (map.getLayer(LAYER_IDS.routeCasing)) map.removeLayer(LAYER_IDS.routeCasing);
    if (map.getSource(SOURCE_IDS.route)) map.removeSource(SOURCE_IDS.route);
  };

  const drawRoute = (geometry: GeoJSON.LineString) => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    removeRoute();

    map.addSource(SOURCE_IDS.route, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry,
      },
    });

    map.addLayer({
      id: LAYER_IDS.routeCasing,
      type: "line",
      source: SOURCE_IDS.route,
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#2b1a12",
        "line-width": 14,
        "line-opacity": 0.9,
      },
    });

    map.addLayer({
      id: LAYER_IDS.route,
      type: "line",
      source: SOURCE_IDS.route,
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#ff7a1a",
        "line-width": 7.5,
        "line-opacity": 1,
      },
    });

    ensureRouteOnTop();
  };

  const tuneSymbolLayer = (map: mapboxgl.Map, layer: mapboxgl.AnyLayer) => {
    if (layer.type !== "symbol") return;

    const sourceLayer = "source-layer" in layer ? String(layer["source-layer"] ?? "") : "";
    const shouldShow =
      LABEL_ID_PATTERNS.test(layer.id) ||
      LABEL_SOURCE_LAYER_PATTERNS.test(sourceLayer);

    if (!shouldShow) {
      map.setLayoutProperty(layer.id, "visibility", "none");
      return;
    }

    map.setLayoutProperty(layer.id, "visibility", "visible");

    if ((layer as { layout?: { ["text-field"]?: unknown } }).layout?.["text-field"]) {
      map.setPaintProperty(layer.id, "text-color", "#46535a");
      map.setPaintProperty(layer.id, "text-halo-color", "#fff8e8");
      map.setPaintProperty(layer.id, "text-halo-width", 1.2);
      map.setPaintProperty(layer.id, "text-halo-blur", 0.35);

      if (/road|street/i.test(layer.id)) {
        map.setPaintProperty(layer.id, "text-color", "#334155");
        map.setLayoutProperty(layer.id, "text-size", [
          "interpolate",
          ["linear"],
          ["zoom"],
          13,
          10,
          16,
          13,
          18,
          15,
        ]);
      }

      if (/poi|place|station|transit|landmark/i.test(layer.id)) {
        map.setPaintProperty(layer.id, "text-color", "#52615f");
        map.setLayoutProperty(layer.id, "text-size", [
          "interpolate",
          ["linear"],
          ["zoom"],
          14,
          10,
          16,
          12,
          18,
          14,
        ]);
      }
    }

    if ((layer as { layout?: { ["icon-image"]?: unknown } }).layout?.["icon-image"]) {
      map.setPaintProperty(layer.id, "icon-opacity", 0.78);
    }
  };

  const fitRoute = (geometry: GeoJSON.LineString) => {
    const map = mapRef.current;
    if (!map || geometry.coordinates.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    geometry.coordinates.forEach((coord) => bounds.extend(coord as [number, number]));
    map.fitBounds(bounds, {
      padding: { top: 92, right: 92, bottom: 92, left: window.innerWidth < 768 ? 92 : 440 },
      duration: 1100,
      pitch: 58,
      bearing: -18,
    });
  };

  const focusStartPoint = (point: RoutePoint) => {
    const map = mapRef.current;
    if (!map) return;

    map.easeTo({
      center: [point.lng, point.lat],
      zoom: Math.max(map.getZoom(), 16.4),
      pitch: 62,
      bearing: -18,
      duration: 900,
      essential: true,
    });
  };

  const focusStep = (step: RouteStepItem) => {
    const map = mapRef.current;
    if (!map || !step.maneuverPoint) return;

    map.easeTo({
      center: [step.maneuverPoint.lng, step.maneuverPoint.lat],
      zoom: Math.max(map.getZoom(), 17.2),
      pitch: 62,
      duration: 900,
      essential: true,
    });
  };

  const addNaturalLayers = (map: mapboxgl.Map, visible: boolean, beforeLayerId?: string) => {
    if (!map.getSource(SOURCE_IDS.waterbodies)) {
      map.addSource(SOURCE_IDS.waterbodies, {
        type: "geojson",
        data: waterDataRef.current ?? toFeatureCollection([]),
      });
    }

    if (!map.getLayer(LAYER_IDS.waterFill)) {
      map.addLayer(
        {
          id: LAYER_IDS.waterFill,
          type: "fill",
          source: SOURCE_IDS.waterbodies,
          layout: visibilityLayout(visible),
          paint: {
            "fill-color": "#9ed7df",
            "fill-opacity": 0.4,
          },
        },
        beforeLayerId
      );
    }

    if (!map.getLayer(LAYER_IDS.waterLine)) {
      map.addLayer(
        {
          id: LAYER_IDS.waterLine,
          type: "line",
          source: SOURCE_IDS.waterbodies,
          layout: visibilityLayout(visible),
          paint: {
            "line-color": "#2a7486",
            "line-width": 1.4,
            "line-opacity": 0.92,
          },
        },
        beforeLayerId
      );
    }

    if (!map.getSource(SOURCE_IDS.parks)) {
      map.addSource(SOURCE_IDS.parks, {
        type: "geojson",
        data: parksDataRef.current ?? toFeatureCollection([]),
      });
    }

    if (!map.getLayer(LAYER_IDS.parksFillBase)) {
      map.addLayer(
        {
          id: LAYER_IDS.parksFillBase,
          type: "fill",
          source: SOURCE_IDS.parks,
          layout: visibilityLayout(visible),
          paint: {
            "fill-color": "#bcebad",
            "fill-opacity": 0.34,
          },
        },
        beforeLayerId
      );
    }

    if (!map.getLayer(LAYER_IDS.parksFillGlow)) {
      map.addLayer(
        {
          id: LAYER_IDS.parksFillGlow,
          type: "fill",
          source: SOURCE_IDS.parks,
          layout: visibilityLayout(visible),
          paint: {
            "fill-color": "#e2f8d6",
            "fill-opacity": 0.18,
          },
        },
        beforeLayerId
      );
    }

    if (!map.getLayer(LAYER_IDS.parksLine)) {
      map.addLayer(
        {
          id: LAYER_IDS.parksLine,
          type: "line",
          source: SOURCE_IDS.parks,
          layout: visibilityLayout(visible),
          paint: {
            "line-color": "#4f8246",
            "line-width": 1.35,
            "line-opacity": 0.94,
          },
        },
        beforeLayerId
      );
    }

  };

  const addEasePlacesLayers = (map: mapboxgl.Map, visible: boolean, beforeLayerId?: string) => {
    if (!map.getSource(SOURCE_IDS.easePlaces)) {
      map.addSource(SOURCE_IDS.easePlaces, {
        type: "geojson",
        data: easePlacesToFeatureCollection(),
      });
    }

    if (!map.getLayer(LAYER_IDS.easePlacesHalo)) {
      map.addLayer(
        {
          id: LAYER_IDS.easePlacesHalo,
          type: "circle",
          source: SOURCE_IDS.easePlaces,
          layout: visibilityLayout(visible),
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              13,
              8,
              16,
              12,
            ],
            "circle-color": ["coalesce", ["get", "haloColor"], "rgba(217,117,164,0.22)"],
            "circle-opacity": 0.95,
          },
        },
        beforeLayerId
      );
    }

    if (!map.getLayer(LAYER_IDS.easePlacesCircle)) {
      map.addLayer(
        {
          id: LAYER_IDS.easePlacesCircle,
          type: "circle",
          source: SOURCE_IDS.easePlaces,
          layout: visibilityLayout(visible),
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              13,
              4,
              16,
              6.5,
            ],
            "circle-color": ["coalesce", ["get", "coreColor"], "#d975a4"],
            "circle-stroke-width": 1.4,
            "circle-stroke-color": "#f8fafc",
            "circle-opacity": 0.98,
          },
        },
        beforeLayerId
      );
    }

    if (!map.getLayer(LAYER_IDS.easePlacesHitArea)) {
      map.addLayer(
        {
          id: LAYER_IDS.easePlacesHitArea,
          type: "circle",
          source: SOURCE_IDS.easePlaces,
          layout: visibilityLayout(visible),
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              13,
              14,
              16,
              18,
            ],
            "circle-color": "#000000",
            "circle-opacity": 0,
          },
        },
        beforeLayerId
      );
    }
  };

  const addStreetFacilitiesLayers = (map: mapboxgl.Map, visible: boolean, beforeLayerId?: string) => {
    if (!map.getSource(SOURCE_IDS.streetFacilities)) {
      map.addSource(SOURCE_IDS.streetFacilities, {
        type: "geojson",
        data: streetFacilitiesDataRef.current ?? toFeatureCollection([]),
      });
    }

    if (!map.getLayer(LAYER_IDS.streetFacilitiesCircle)) {
      map.addLayer(
        {
          id: LAYER_IDS.streetFacilitiesCircle,
          type: "circle",
          source: SOURCE_IDS.streetFacilities,
          layout: visibilityLayout(visible),
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              13,
              4,
              16,
              6.5,
            ],
            "circle-color": ["coalesce", ["get", "color"], "#0f172a"],
            "circle-stroke-width": 1.25,
            "circle-stroke-color": "#f8fafc",
            "circle-opacity": 0.96,
            "circle-blur": 0.05,
          },
        },
        beforeLayerId
      );
    }

    if (!map.getLayer(LAYER_IDS.streetFacilitiesHitArea)) {
      map.addLayer(
        {
          id: LAYER_IDS.streetFacilitiesHitArea,
          type: "circle",
          source: SOURCE_IDS.streetFacilities,
          layout: visibilityLayout(visible),
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              13,
              14,
              16,
              18,
            ],
            "circle-color": "#000000",
            "circle-opacity": 0,
          },
        },
        beforeLayerId
      );
    }
  };

  const bindNaturalPopup = (map: mapboxgl.Map, layerId: string, label: string, propertyKeys: string[]) => {
    map.on("mouseenter", layerId, () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", layerId, () => {
      map.getCanvas().style.cursor = "";
      removePopup(naturalPopupRef);
    });

    map.on("mousemove", layerId, (event) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const name = propertyKeys
        .map((key) => String(feature.properties?.[key] ?? "").trim())
        .find(Boolean);
      if (!name) return;

      if (!naturalPopupRef.current) {
        naturalPopupRef.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12,
          className: "mapboxgl-popup maplibre-tip-popup",
        });
      }

      naturalPopupRef.current
        .setLngLat(event.lngLat)
        .setHTML(`<strong>${label}</strong><br/>${name}`)
        .addTo(map);
    });
  };

  const bindEasePlacesPopup = (map: mapboxgl.Map) => {
    map.on("mouseenter", LAYER_IDS.easePlacesHitArea, () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", LAYER_IDS.easePlacesHitArea, () => {
      map.getCanvas().style.cursor = "";
      removePopup(easePlacesPopupRef);
    });

    map.on("mousemove", LAYER_IDS.easePlacesHitArea, (event) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const name = String(feature.properties?.name ?? "").trim();
      const category = String(feature.properties?.category ?? "").trim();
      const type = String(feature.properties?.type ?? "").trim();
      if (!name) return;

      if (!easePlacesPopupRef.current) {
        easePlacesPopupRef.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12,
          className: "mapboxgl-popup maplibre-tip-popup",
        });
      }

      const detailLine = [category, type].filter(Boolean).join(" · ");
      easePlacesPopupRef.current
        .setLngLat(event.lngLat)
        .setHTML(detailLine ? `<strong>${name}</strong><br/>${detailLine}` : `<strong>${name}</strong>`)
        .addTo(map);
    });

    map.on("click", LAYER_IDS.easePlacesHitArea, (event) => {
      const feature = event.features?.[0];
      if (!feature || !onEasePlaceSelectRef.current) return;
      const id = String(feature.properties?.id ?? "").trim();
      const selectedFeature = EASE_PLACES_DATA.find((item) => item.id === id);
      if (!selectedFeature) return;

      onEasePlaceSelectRef.current(
        selectedFeature,
        { x: event.point.x, y: event.point.y },
        {
          width: map.getContainer().clientWidth,
          height: map.getContainer().clientHeight,
        }
      );
    });
  };

  const bindStreetFacilitiesPopup = (map: mapboxgl.Map) => {
    map.on("mouseenter", LAYER_IDS.streetFacilitiesHitArea, () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", LAYER_IDS.streetFacilitiesHitArea, () => {
      map.getCanvas().style.cursor = "";
      removePopup(streetFacilitiesPopupRef);
    });

    map.on("mousemove", LAYER_IDS.streetFacilitiesHitArea, (event) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const label = String(feature.properties?.label ?? "").trim();
      const location = String(feature.properties?.location_desc ?? "").trim();
      if (!label) return;

      if (!streetFacilitiesPopupRef.current) {
        streetFacilitiesPopupRef.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12,
          className: "mapboxgl-popup maplibre-tip-popup maplibre-furniture-popup",
        });
      }

      streetFacilitiesPopupRef.current
        .setLngLat(event.lngLat)
        .setHTML(
          location
            ? `<span class="furniture-tip-label">${label}</span><span class="furniture-tip-location">${location}</span>`
            : `<span class="furniture-tip-label">${label}</span>`
        )
        .addTo(map);
    });
  };

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    onMapErrorRef.current = onMapError;
  }, [onMapError]);

  useEffect(() => {
    onViewportControlsReadyRef.current = onViewportControlsReady;
  }, [onViewportControlsReady]);

  useEffect(() => {
    onEasePlaceSelectRef.current = onEasePlaceSelect;
  }, [onEasePlaceSelect]);

  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  useEffect(() => {
    if (!route) {
      hasFocusedInitialRouteRef.current = false;
    }
  }, [route]);

  useEffect(() => {
    showEasePlacesRef.current = showEasePlaces;
  }, [showEasePlaces]);

  useEffect(() => {
    showNaturalPlacesRef.current = showNaturalPlaces;
  }, [showNaturalPlaces]);

  useEffect(() => {
    showStreetFacilitiesRef.current = showStreetFacilities;
  }, [showStreetFacilities]);

  useEffect(() => {
    fetch("/geoscape/waterbodies.geojson")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return;
        waterDataRef.current = data;
        updateSource(SOURCE_IDS.waterbodies, data);
      })
      .catch((error: unknown) => {
        console.error("[WhiteModelMap] failed to load waterbodies layer", error);
      });

    fetch("/geoscape/parks.geojson")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return;
        parksDataRef.current = data;
        updateSource(SOURCE_IDS.parks, data);
      })
      .catch((error: unknown) => {
        console.error("[WhiteModelMap] failed to load parks layer", error);
      });

    fetchSupportedFacilitiesCatalog()
      .then((features) => {
        const data = toFeatureCollection(
          features
            .map((feature) => {
              const kind = classifySupportedFacility(feature.properties.asset_type);
              if (!kind) return null;
              const [lng, lat] = feature.geometry.coordinates;
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
              const style = facilityStyle(kind);
              return {
                type: "Feature" as const,
                geometry: {
                  type: "Point" as const,
                  coordinates: [lng, lat],
                },
                properties: {
                  kind,
                  label: style.label,
                  location_desc: feature.properties.location_desc || "",
                  color: style.color,
                  halo: style.halo,
                },
              };
            })
            .filter((feature): feature is GeoJSON.Feature => feature !== null)
        );
        streetFacilitiesDataRef.current = data;
        updateSource(SOURCE_IDS.streetFacilities, data);
      })
      .catch((error: unknown) => {
        console.error("[WhiteModelMap] failed to load street facilities", error);
      });
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: MELBOURNE_CENTER,
      zoom: 15.6,
      pitch: 62,
      bearing: -22,
      antialias: true,
    });

    mapRef.current = map;
    map.dragPan.enable();
    map.dragRotate.enable();
    map.touchZoomRotate.enable();
    map.touchZoomRotate.enableRotation();
    if ("touchPitch" in map && map.touchPitch) {
      map.touchPitch.enable();
    }
    map.getCanvas().style.touchAction = "none";
    map.getContainer().style.touchAction = "none";
    if (showNavigationControl) {
      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    }

    onViewportControlsReadyRef.current?.({
      zoomIn: () => {
        map.easeTo({
          zoom: Math.min(map.getZoom() + 0.9, 20),
          duration: 280,
        });
      },
      zoomOut: () => {
        map.easeTo({
          zoom: Math.max(map.getZoom() - 0.9, 11.5),
          duration: 280,
        });
      },
    });

    map.on("error", (event) => {
      const status = (event.error as { status?: number } | undefined)?.status;
      const detail = status ? ` Mapbox returned status ${status}.` : "";
      onMapErrorRef.current(`The 3D map could not load.${detail} Check the Mapbox public token and try again.`);
    });

    map.on("style.load", () => {
      const style = map.getStyle();

      for (const layer of style.layers ?? []) {
        tuneSymbolLayer(map, layer);
      }

      if (map.getLayer("background")) {
        map.setPaintProperty("background", "background-color", "#f1eee6");
      }

      const lineLayers = (style.layers ?? [])
        .filter((layer) => layer.type === "line" && /(road|transport|street|path)/i.test(layer.id))
        .map((layer) => layer.id);

      for (const layerId of lineLayers) {
        map.setPaintProperty(layerId, "line-color", "#d7c6a8");
        map.setPaintProperty(layerId, "line-opacity", 0.72);
      }

      const fillLayers = (style.layers ?? [])
        .filter((layer) => layer.type === "fill" && /(park|landuse|landcover|water)/i.test(layer.id))
        .map((layer) => layer.id);

      for (const layerId of fillLayers) {
        if (/water/i.test(layerId)) {
          map.setPaintProperty(layerId, "fill-color", "#b9dbe0");
          map.setPaintProperty(layerId, "fill-opacity", 0.72);
        } else if (/park|landuse|landcover/i.test(layerId)) {
          map.setPaintProperty(layerId, "fill-color", "#cfe0b7");
          map.setPaintProperty(layerId, "fill-opacity", 0.64);
        } else {
          map.setPaintProperty(layerId, "fill-color", "#eadfca");
          map.setPaintProperty(layerId, "fill-opacity", 0.58);
        }
      }

      const labelLayerId = (style.layers ?? []).find(
        (layer) =>
          layer.type === "symbol" &&
          (layer as { layout?: { ["text-field"]?: unknown } }).layout?.["text-field"]
      )?.id;

      addNaturalLayers(map, showNaturalPlacesRef.current, labelLayerId);

      if (!map.getLayer(LAYER_IDS.buildings)) {
        map.addLayer(
          {
            id: LAYER_IDS.buildings,
            type: "fill-extrusion",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            minzoom: 14,
            paint: {
              "fill-extrusion-color": [
                "interpolate",
                ["linear"],
                ["coalesce", ["get", "height"], 8],
                0,
                "#c8bfb2",
                12,
                "#d8cfbf",
                28,
                "#e7dece",
                52,
                "#f3ebdc",
                96,
                "#fff8ec",
              ],
              "fill-extrusion-opacity": 0.88,
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                14,
                0,
                15,
                ["coalesce", ["get", "height"], 8],
              ],
              "fill-extrusion-base": [
                "interpolate",
                ["linear"],
                ["zoom"],
                14,
                0,
                15,
                ["coalesce", ["get", "min_height"], 0],
              ],
              "fill-extrusion-vertical-gradient": true,
            },
          },
          labelLayerId
        );
      }

      addEasePlacesLayers(map, showEasePlacesRef.current, labelLayerId);
      addStreetFacilitiesLayers(map, showStreetFacilitiesRef.current, labelLayerId);
      bindNaturalPopup(map, LAYER_IDS.waterFill, "Waterbody", ["NAME_LABEL", "NAME"]);
      bindNaturalPopup(map, LAYER_IDS.parksFillBase, "Park", ["NAME_LABEL", "NAME"]);
      bindEasePlacesPopup(map);
      bindStreetFacilitiesPopup(map);

      setLayerVisibility(
        [LAYER_IDS.parksFillBase, LAYER_IDS.parksFillGlow, LAYER_IDS.parksLine, LAYER_IDS.waterFill, LAYER_IDS.waterLine],
        showNaturalPlacesRef.current
      );
      setLayerVisibility(
        [LAYER_IDS.easePlacesHalo, LAYER_IDS.easePlacesCircle, LAYER_IDS.easePlacesHitArea],
        showEasePlacesRef.current
      );
      setLayerVisibility(
        [LAYER_IDS.streetFacilitiesCircle, LAYER_IDS.streetFacilitiesHitArea],
        showStreetFacilitiesRef.current
      );

      if (routeRef.current?.geometry) {
        drawRoute(routeRef.current.geometry);
        fitRoute(routeRef.current.geometry);
      }
    });

    map.on("click", (event) => {
      const easePlaceHits = map.queryRenderedFeatures(event.point, {
        layers: [LAYER_IDS.easePlacesHitArea],
      });
      if (easePlaceHits.length > 0) return;
      const facilityHits = map.queryRenderedFeatures(event.point, {
        layers: [LAYER_IDS.streetFacilitiesHitArea],
      });
      if (facilityHits.length > 0) return;
      onMapClickRef.current({ lng: event.lngLat.lng, lat: event.lngLat.lat });
    });

    return () => {
      onViewportControlsReadyRef.current?.(null);
      startMarkerRef.current?.remove();
      endMarkerRef.current?.remove();
      focusedStepMarkerRef.current?.remove();
      removePopup(naturalPopupRef);
      removePopup(easePlacesPopupRef);
      removePopup(streetFacilitiesPopupRef);
      removeRoute();
      map.remove();
      mapRef.current = null;
      startMarkerRef.current = null;
      endMarkerRef.current = null;
      focusedStepMarkerRef.current = null;
    };
  }, [mapboxToken, showNavigationControl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    setLayerVisibility(
      [LAYER_IDS.parksFillBase, LAYER_IDS.parksFillGlow, LAYER_IDS.parksLine, LAYER_IDS.waterFill, LAYER_IDS.waterLine],
      showNaturalPlaces
    );
    if (!showNaturalPlaces) {
      removePopup(naturalPopupRef);
    }
    ensureRouteOnTop();
  }, [showNaturalPlaces]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    setLayerVisibility(
      [LAYER_IDS.easePlacesHalo, LAYER_IDS.easePlacesCircle, LAYER_IDS.easePlacesHitArea],
      showEasePlaces
    );
    if (!showEasePlaces) {
      removePopup(easePlacesPopupRef);
    }
    ensureRouteOnTop();
  }, [showEasePlaces]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    setLayerVisibility(
      [LAYER_IDS.streetFacilitiesCircle, LAYER_IDS.streetFacilitiesHitArea],
      showStreetFacilities
    );
    if (!showStreetFacilities) {
      removePopup(streetFacilitiesPopupRef);
    }
    ensureRouteOnTop();
  }, [showStreetFacilities]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (startPoint) {
      if (!startMarkerRef.current) {
        startMarkerRef.current = new mapboxgl.Marker({
          element: createMarkerElement("#0f766e", "S"),
          anchor: "center",
        });
      }
      startMarkerRef.current.setLngLat(toLngLat(startPoint)).addTo(map);
    } else {
      startMarkerRef.current?.remove();
      startMarkerRef.current = null;
    }
  }, [startPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (endPoint) {
      if (!endMarkerRef.current) {
        endMarkerRef.current = new mapboxgl.Marker({
          element: createMarkerElement("#ea580c", "E"),
          anchor: "center",
        });
      }
      endMarkerRef.current.setLngLat(toLngLat(endPoint)).addTo(map);
    } else {
      endMarkerRef.current?.remove();
      endMarkerRef.current = null;
    }
  }, [endPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!route) {
      removeRoute();
      return;
    }

    const drawAndFocusRoute = () => {
      if (!mapRef.current || mapRef.current !== map || routeRef.current !== route || !map.isStyleLoaded()) {
        return;
      }
      drawRoute(route.geometry);
      ensureRouteOnTop();

      if (startPoint) {
        hasFocusedInitialRouteRef.current = true;
        focusStartPoint(startPoint);
        return;
      }

      fitRoute(route.geometry);
    };

    const scheduleRouteStabilizers = () => {
      window.setTimeout(drawAndFocusRoute, 140);
      window.setTimeout(drawAndFocusRoute, 420);
      window.setTimeout(drawAndFocusRoute, 1100);
    };

    if (map.isStyleLoaded()) {
      drawAndFocusRoute();
      map.once("idle", drawAndFocusRoute);
      scheduleRouteStabilizers();
      return;
    }

    map.once("style.load", () => {
      if (routeRef.current !== route) return;
      drawAndFocusRoute();
      map.once("idle", drawAndFocusRoute);
      scheduleRouteStabilizers();
    });
  }, [route, startPoint, endPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusedStep?.maneuverPoint) {
      focusedStepMarkerRef.current?.remove();
      focusedStepMarkerRef.current = null;
      return;
    }

    if (!focusedStepMarkerRef.current) {
      focusedStepMarkerRef.current = new mapboxgl.Marker({
        element: createFocusMarkerElement(),
        anchor: "center",
      });
    }

    focusedStepMarkerRef.current
      .setLngLat([focusedStep.maneuverPoint.lng, focusedStep.maneuverPoint.lat])
      .addTo(map);

    focusStep(focusedStep);
  }, [focusedStep]);

  return <div ref={containerRef} className="route-3d-map" style={{ minHeight: "100dvh", width: "100%", touchAction: "none" }} />;
}
