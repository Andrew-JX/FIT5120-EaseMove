import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { EASE_PLACES_DATA, easePlacesMarkerColor } from "../lib/easePlaces";
import type { ActivityDensityFeature } from "../lib/api";

export const MELBOURNE_CENTER: [number, number] = [144.9631, -37.8136];

const LABEL_SOURCE_LAYER_PATTERNS = /(road|street|place|poi|transit|station|natural|landmark)/i;
const LABEL_ID_PATTERNS = /(road|street|place|poi|transit|station|label|natural|park|water|settlement)/i;

const SOURCE_IDS = {
  route: "route",
  parks: "parks-3d",
  waterbodies: "waterbodies-3d",
  easePlaces: "ease-places-3d",
  activityDensity: "activity-density-3d",
} as const;

const LAYER_IDS = {
  routeCasing: "route-line-casing",
  route: "route-line",
  parksFill: "parks-fill-3d",
  parksLine: "parks-line-3d",
  waterFill: "waterbodies-fill-3d",
  waterLine: "waterbodies-line-3d",
  easePlacesHalo: "ease-places-halo-3d",
  easePlacesCircle: "ease-places-circle-3d",
  easePlacesHitArea: "ease-places-hit-area-3d",
  activityHeatmap: "activity-heatmap-3d",
  activityCircle: "activity-circle-3d",
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

type WhiteModelMapProps = {
  mapboxToken: string | null;
  startPoint: RoutePoint | null;
  endPoint: RoutePoint | null;
  route: RouteSummary | null;
  focusedStep: RouteStepItem | null;
  showEasePlaces: boolean;
  showNaturalPlaces: boolean;
  showActivityDensity: boolean;
  activityHour: number | null;
  activityFeatures: ActivityDensityFeature[];
  onMapClick: (point: RoutePoint) => void;
  onMapError: (message: string) => void;
};

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
  el.style.width = "24px";
  el.style.height = "24px";
  el.style.borderRadius = "999px";
  el.style.border = "3px solid white";
  el.style.boxShadow = "0 14px 28px rgba(15, 23, 42, 0.28)";
  el.style.background = color;
  el.style.display = "grid";
  el.style.placeItems = "center";
  el.style.color = "white";
  el.style.fontSize = "11px";
  el.style.fontWeight = "800";
  el.style.lineHeight = "1";
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
  showActivityDensity,
  activityHour,
  activityFeatures,
  onMapClick,
  onMapError,
}: WhiteModelMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const endMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const focusedStepMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const naturalPopupRef = useRef<mapboxgl.Popup | null>(null);
  const easePlacesPopupRef = useRef<mapboxgl.Popup | null>(null);
  const parksDataRef = useRef<FeatureCollection | null>(null);
  const waterDataRef = useRef<FeatureCollection | null>(null);
  const onMapClickRef = useRef(onMapClick);
  const onMapErrorRef = useRef(onMapError);
  const routeRef = useRef(route);
  const showEasePlacesRef = useRef(showEasePlaces);
  const showNaturalPlacesRef = useRef(showNaturalPlaces);
  const showActivityDensityRef = useRef(showActivityDensity);
  const activityHourRef = useRef(activityHour);
  const activityFeaturesRef = useRef(activityFeatures);

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

  const activityFeatureCollectionForHour = (hour: number | null, features: ActivityDensityFeature[]): FeatureCollection => {
    if (hour === null) return toFeatureCollection([]);
    return toFeatureCollection(
      features
        .filter((feature) => feature.hourday === hour)
        .map((feature) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [feature.lng, feature.lat],
          },
          properties: {
            location_id: feature.location_id,
            sensor_name: feature.sensor_name,
            hourday: feature.hourday,
            pedestrian_count: feature.pedestrian_count,
            activity_level: feature.activity_level,
            intensity: feature.pedestrian_count,
          },
        }))
    );
  };

  const updateActivityDensityPresentation = (hour: number | null, features: ActivityDensityFeature[], visible: boolean) => {
    const hourSlice = activityFeatureCollectionForHour(hour, features);
    updateSource(SOURCE_IDS.activityDensity, hourSlice);
    setLayerVisibility(
      [LAYER_IDS.activityHeatmap, LAYER_IDS.activityCircle],
      visible && hour !== null && hourSlice.features.length > 0
    );
    ensureRouteOnTop();
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
        "line-color": "#f8fafc",
        "line-width": 11,
        "line-opacity": 0.95,
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
        "line-color": "#0f766e",
        "line-width": 5.5,
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

    if (!map.getLayer(LAYER_IDS.parksFill)) {
      map.addLayer(
        {
          id: LAYER_IDS.parksFill,
          type: "fill",
          source: SOURCE_IDS.parks,
          layout: visibilityLayout(visible),
          paint: {
            "fill-color": "#b8d9a6",
            "fill-opacity": 0.24,
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
            "line-color": "#4b7b46",
            "line-width": 1.1,
            "line-opacity": 0.88,
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

  const addActivityDensityLayers = (map: mapboxgl.Map, visible: boolean) => {
    if (!map.getSource(SOURCE_IDS.activityDensity)) {
      map.addSource(SOURCE_IDS.activityDensity, {
        type: "geojson",
        data: toFeatureCollection([]),
      });
    }

    if (!map.getLayer(LAYER_IDS.activityHeatmap)) {
      map.addLayer({
        id: LAYER_IDS.activityHeatmap,
        type: "heatmap",
        source: SOURCE_IDS.activityDensity,
        layout: visibilityLayout(visible),
        maxzoom: 18,
        paint: {
          "heatmap-weight": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "intensity"], 0],
            0,
            0,
            80,
            0.18,
            160,
            0.42,
            300,
            0.72,
            500,
            1,
          ],
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            12,
            0.75,
            16,
            1.2,
          ],
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            12,
            22,
            16,
            34,
          ],
          "heatmap-opacity": 0.48,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(255,236,179,0)",
            0.2,
            "rgba(255,236,179,0.45)",
            0.45,
            "rgba(255,183,77,0.68)",
            0.7,
            "rgba(255,112,67,0.82)",
            1,
            "rgba(198,40,40,0.9)",
          ],
        },
      });
    }

    if (!map.getLayer(LAYER_IDS.activityCircle)) {
      map.addLayer({
        id: LAYER_IDS.activityCircle,
        type: "circle",
        source: SOURCE_IDS.activityDensity,
        layout: visibilityLayout(visible),
        minzoom: 14,
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "intensity"], 0],
            0,
            0,
            80,
            4,
            180,
            7,
            320,
            10,
            500,
            12,
          ],
          "circle-color": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "intensity"], 0],
            0,
            "rgba(255,236,179,0)",
            80,
            "#ffd54f",
            180,
            "#ffb74d",
            320,
            "#ff7043",
            500,
            "#d84315",
          ],
          "circle-opacity": 0.72,
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,248,232,0.86)",
        },
      });
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
  };

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    onMapErrorRef.current = onMapError;
  }, [onMapError]);

  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  useEffect(() => {
    showEasePlacesRef.current = showEasePlaces;
  }, [showEasePlaces]);

  useEffect(() => {
    showNaturalPlacesRef.current = showNaturalPlaces;
  }, [showNaturalPlaces]);

  useEffect(() => {
    showActivityDensityRef.current = showActivityDensity;
  }, [showActivityDensity]);

  useEffect(() => {
    activityHourRef.current = activityHour;
  }, [activityHour]);

  useEffect(() => {
    activityFeaturesRef.current = activityFeatures;
  }, [activityFeatures]);

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
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

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
                ["zoom"],
                14,
                "#e8d7b5",
                17,
                "#f0dfbd",
              ],
              "fill-extrusion-opacity": 0.92,
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
      addActivityDensityLayers(map, false);
      bindNaturalPopup(map, LAYER_IDS.waterFill, "Waterbody", ["NAME_LABEL", "NAME"]);
      bindNaturalPopup(map, LAYER_IDS.parksFill, "Park", ["NAME_LABEL", "NAME"]);
      bindEasePlacesPopup(map);

      setLayerVisibility(
        [LAYER_IDS.parksFill, LAYER_IDS.parksLine, LAYER_IDS.waterFill, LAYER_IDS.waterLine],
        showNaturalPlacesRef.current
      );
      setLayerVisibility(
        [LAYER_IDS.easePlacesHalo, LAYER_IDS.easePlacesCircle, LAYER_IDS.easePlacesHitArea],
        showEasePlacesRef.current
      );
      setLayerVisibility(
        [LAYER_IDS.activityHeatmap, LAYER_IDS.activityCircle],
        showActivityDensityRef.current
      );
      updateActivityDensityPresentation(
        activityHourRef.current,
        activityFeaturesRef.current,
        showActivityDensityRef.current
      );

      if (routeRef.current?.geometry) {
        drawRoute(routeRef.current.geometry);
      }
    });

    map.on("click", (event) => {
      const easePlaceHits = map.queryRenderedFeatures(event.point, {
        layers: [LAYER_IDS.easePlacesHitArea],
      });
      if (easePlaceHits.length > 0) return;
      onMapClickRef.current({ lng: event.lngLat.lng, lat: event.lngLat.lat });
    });

    return () => {
      startMarkerRef.current?.remove();
      endMarkerRef.current?.remove();
      focusedStepMarkerRef.current?.remove();
      removePopup(naturalPopupRef);
      removePopup(easePlacesPopupRef);
      removeRoute();
      map.remove();
      mapRef.current = null;
      startMarkerRef.current = null;
      endMarkerRef.current = null;
      focusedStepMarkerRef.current = null;
    };
  }, [mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    setLayerVisibility(
      [LAYER_IDS.parksFill, LAYER_IDS.parksLine, LAYER_IDS.waterFill, LAYER_IDS.waterLine],
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
    updateActivityDensityPresentation(activityHour, activityFeatures, showActivityDensity);
  }, [activityFeatures, activityHour, showActivityDensity]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (startPoint) {
      if (!startMarkerRef.current) {
        startMarkerRef.current = new mapboxgl.Marker({
          element: createMarkerElement("#111827", "S"),
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
          element: createMarkerElement("#2563eb", "E"),
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

    if (map.isStyleLoaded()) {
      drawRoute(route.geometry);
      fitRoute(route.geometry);
      return;
    }

    map.once("style.load", () => {
      drawRoute(route.geometry);
      fitRoute(route.geometry);
    });
  }, [route]);

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

  return <div ref={containerRef} style={{ minHeight: "100dvh", width: "100%" }} />;
}
