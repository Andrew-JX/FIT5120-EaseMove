import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export const MELBOURNE_CENTER: [number, number] = [144.9631, -37.8136];
const LABEL_SOURCE_LAYER_PATTERNS = /(road|street|place|poi|transit|station|natural|landmark)/i;
const LABEL_ID_PATTERNS = /(road|street|place|poi|transit|station|label|natural|park|water|settlement)/i;

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
  onMapClick: (point: RoutePoint) => void;
  onMapError: (message: string) => void;
};

function toLngLat(point: RoutePoint): [number, number] {
  return [point.lng, point.lat];
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

export default function WhiteModelMap({
  mapboxToken,
  startPoint,
  endPoint,
  route,
  onMapClick,
  onMapError,
}: WhiteModelMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const endMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const onMapClickRef = useRef(onMapClick);
  const onMapErrorRef = useRef(onMapError);

  const removeRoute = () => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("route-line")) map.removeLayer("route-line");
    if (map.getLayer("route-line-casing")) map.removeLayer("route-line-casing");
    if (map.getSource("route")) map.removeSource("route");
  };

  const drawRoute = (geometry: GeoJSON.LineString) => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    removeRoute();

    map.addSource("route", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry,
      },
    });

    map.addLayer({
      id: "route-line-casing",
      type: "line",
      source: "route",
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
      id: "route-line",
      type: "line",
      source: "route",
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

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    onMapErrorRef.current = onMapError;
  }, [onMapError]);

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

      if (!map.getLayer("white-model-buildings")) {
        map.addLayer(
          {
            id: "white-model-buildings",
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

      if (route?.geometry) {
        drawRoute(route.geometry);
      }
    });

    map.on("click", (event) => {
      onMapClickRef.current({ lng: event.lngLat.lng, lat: event.lngLat.lat });
    });

    return () => {
      startMarkerRef.current?.remove();
      endMarkerRef.current?.remove();
      removeRoute();
      map.remove();
      mapRef.current = null;
      startMarkerRef.current = null;
      endMarkerRef.current = null;
    };
  }, [mapboxToken]);

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
    } else {
      map.once("style.load", () => {
        drawRoute(route.geometry);
        fitRoute(route.geometry);
      });
    }
  }, [route]);

  return <div ref={containerRef} style={{ minHeight: "100dvh", width: "100%" }} />;
}
