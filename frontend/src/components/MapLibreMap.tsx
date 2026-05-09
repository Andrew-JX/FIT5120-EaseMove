import { useEffect, useRef } from "react";
import maplibregl, { type GeoJSONSource, type Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { fetchFurniture, type FurnitureFeature, type Precinct } from "../lib/api";
import { EASE_PLACES_DATA, easePlacesMarkerColor, type EasePlacesFeature } from "../lib/easePlaces";
import type { MapViewportController } from "./mapTypes";

type FeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>;

const AREA_FILL_COLORS: Record<string, string> = {
  docklands: "#6fd3c2",
  southbank: "#73c8ff",
  "north-melbourne": "#86d39b",
  "west-melbourne": "#b7d38a",
  "east-melbourne": "#86d9d0",
  "south-melbourne": "#7bc0ff",
  fitzroy: "#f0c16b",
  kensington: "#8ec5ff",
  flemington: "#c1b0ff",
  "melbourne-cbd": "#9de0cf",
  "south-yarra": "#f2bf88",
  carlton: "#a6d9a2",
};

function cpMarkerColor(category: string): { core: string; halo: string } {
  if (category.includes("Arts")) return { core: "#5b5b9b", halo: "rgba(91,91,155,0.3)" };
  if (category.includes("Recreation")) return { core: "#00a859", halo: "rgba(0,168,89,0.3)" };
  return { core: "#e197b9", halo: "rgba(225,151,185,0.3)" };
}

function comfortColor(label: string, stale: boolean): string {
  if (stale) return "#9ca3af";
  if (label === "Comfortable") return "#22c55e";
  if (label === "Caution") return "#eab308";
  return "#ef4444";
}

function riskLevel(label: string): "low" | "caution" | "high" {
  if (label === "Comfortable") return "low";
  if (label === "Caution") return "caution";
  return "high";
}

function furnitureStyle(assetType: string): { label: string; color: string; radius: number } {
  const type = assetType.toLowerCase();
  if (type.includes("bicycle")) return { label: "Bicycle Rack", color: "#c2410c", radius: 4 };
  if (type.includes("drinking")) return { label: "Drinking Fountain", color: "#06b6d4", radius: 4 };
  if (type.includes("bin")) return { label: "Bin", color: "#f97316", radius: 4 };
  if (type.includes("barbecue")) return { label: "Barbecue", color: "#ef4444", radius: 4 };
  if (type.includes("seat")) return { label: "Seat", color: "#a855f7", radius: 4 };
  if (type.includes("bollard")) return { label: "Bollard", color: "#7c3aed", radius: 4 };
  if (type.includes("horse")) return { label: "Horse Trough", color: "#a16207", radius: 4 };
  if (type.includes("planter")) return { label: "Planter Box", color: "#84cc16", radius: 4 };
  return { label: assetType || "Street Furniture", color: "#0f172a", radius: 4 };
}

function classifyFurnitureType(assetType: string): "bicycle" | "drinking" | "seat" | null {
  const type = assetType.toLowerCase();
  if (type.includes("bicycle")) return "bicycle";
  if (type.includes("drinking")) return "drinking";
  if (type.includes("seat")) return "seat";
  return null;
}

function hasValidCoords(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function toFeatureCollection(features: GeoJSON.Feature[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features,
  };
}

interface MapLibreMapProps {
  precincts: Precinct[];
  selectedCategory: string | null;
  activeMode: "view" | "compare";
  compareSelection1: string | null;
  compareSelection2: string | null;
  onPrecinctClick: (id: string) => void;
  onAreaClick?: (id: string) => void;
  showInteractiveAreas?: boolean;
  showEasePlaces?: boolean;
  showStreetFacilities?: boolean;
  showNaturalPlaces?: boolean;
  onMapReady?: (map: MapViewportController) => void;
  onEasePlacesClick?: (feature: EasePlacesFeature, point: { x: number; y: number }) => void;
}

export default function MapLibreMap({
  precincts,
  selectedCategory,
  activeMode,
  compareSelection1,
  compareSelection2,
  onPrecinctClick,
  onAreaClick,
  showInteractiveAreas = false,
  showEasePlaces = true,
  showStreetFacilities = true,
  showNaturalPlaces = true,
  onMapReady,
  onEasePlacesClick,
}: MapLibreMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const precinctMarkersRef = useRef<maplibregl.Marker[]>([]);
  const easePlaceMarkersRef = useRef<maplibregl.Marker[]>([]);
  const loadedRef = useRef(false);
  const boundaryDataRef = useRef<FeatureCollection | null>(null);
  const areaDataRef = useRef<FeatureCollection | null>(null);
  const waterDataRef = useRef<FeatureCollection | null>(null);
  const parksDataRef = useRef<FeatureCollection | null>(null);
  const furnitureDataRef = useRef<FeatureCollection | null>(null);
  const areaPopupRef = useRef<Popup | null>(null);
  const naturalPopupRef = useRef<Popup | null>(null);
  const markerPopupRef = useRef<Popup | null>(null);

  const updateSource = (id: string, data: FeatureCollection | null) => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || !data) return;
    const source = map.getSource(id) as GeoJSONSource | undefined;
    if (source) source.setData(data);
  };

  const setLayerVisibility = (layerIds: string[], visible: boolean) => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    for (const layerId of layerIds) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
      }
    }
  };

  const isMarkerTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest(".maplibre-marker-button"));
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          carto: {
            type: "raster",
            tiles: ["https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          },
        },
        layers: [{ id: "carto-base", type: "raster", source: "carto" }],
      },
      center: [144.96, -37.815],
      zoom: 14,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }));
    mapRef.current = map;

    const controller: MapViewportController = {
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
      flyTo: (center, zoom, options) => {
        map.flyTo({
          center: [center[1], center[0]],
          zoom,
          duration: (options?.duration ?? 1.2) * 1000,
        });
      },
    };

    onMapReady?.(controller);

    map.on("load", () => {
      loadedRef.current = true;

      map.addSource("municipal-boundary", { type: "geojson", data: boundaryDataRef.current ?? toFeatureCollection([]) });
      map.addLayer({
        id: "municipal-boundary-line",
        type: "line",
        source: "municipal-boundary",
        paint: { "line-color": "#111111", "line-width": 2, "line-opacity": 1 },
      });

      map.addSource("interactive-areas", { type: "geojson", data: areaDataRef.current ?? toFeatureCollection([]) });
      map.addLayer({
        id: "interactive-areas-fill",
        type: "fill",
        source: "interactive-areas",
        paint: {
          "fill-color": [
            "match",
            ["coalesce", ["get", "id"], ""],
            ...Object.entries(AREA_FILL_COLORS).flatMap(([key, value]) => [key, value]),
            "#7bc6c2",
          ],
          "fill-opacity": 0.12,
        },
      });
      map.addLayer({
        id: "interactive-areas-line",
        type: "line",
        source: "interactive-areas",
        paint: {
          "line-color": [
            "match",
            ["coalesce", ["get", "id"], ""],
            ...Object.entries(AREA_FILL_COLORS).flatMap(([key, value]) => [key, value]),
            "#7bc6c2",
          ],
          "line-width": 1.4,
          "line-opacity": 0.95,
        },
      });

      map.addSource("waterbodies", { type: "geojson", data: waterDataRef.current ?? toFeatureCollection([]) });
      map.addLayer({
        id: "waterbodies-fill",
        type: "fill",
        source: "waterbodies",
        paint: { "fill-color": "#22d3ee", "fill-opacity": 0.18 },
      });
      map.addLayer({
        id: "waterbodies-line",
        type: "line",
        source: "waterbodies",
        paint: { "line-color": "#0e7490", "line-width": 1.2, "line-opacity": 0.9 },
      });

      map.addSource("parks", { type: "geojson", data: parksDataRef.current ?? toFeatureCollection([]) });
      map.addLayer({
        id: "parks-fill",
        type: "fill",
        source: "parks",
        paint: { "fill-color": "#4ade80", "fill-opacity": 0.08 },
      });
      map.addLayer({
        id: "parks-line",
        type: "line",
        source: "parks",
        paint: { "line-color": "#166534", "line-width": 1, "line-opacity": 0.85 },
      });

      map.addSource("street-furniture", { type: "geojson", data: furnitureDataRef.current ?? toFeatureCollection([]) });
      map.addLayer({
        id: "street-furniture-circles",
        type: "circle",
        source: "street-furniture",
        paint: {
          "circle-radius": ["coalesce", ["get", "radius"], 4],
          "circle-color": ["coalesce", ["get", "color"], "#0f172a"],
          "circle-stroke-color": "#111827",
          "circle-stroke-width": 1,
          "circle-opacity": 0.9,
        },
      });

      const ensureCursor = (value: string) => {
        map.getCanvas().style.cursor = value;
      };

      map.on("mouseenter", "interactive-areas-fill", () => ensureCursor("pointer"));
      map.on("mouseleave", "interactive-areas-fill", () => {
        ensureCursor("");
        areaPopupRef.current?.remove();
      });
      map.on("mousemove", "interactive-areas-fill", (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const name = String(feature.properties?.name ?? "").trim();
        if (!name) return;
        if (!areaPopupRef.current) {
          areaPopupRef.current = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: "maplibre-tip-popup",
          });
        }
        areaPopupRef.current
          .setLngLat(event.lngLat)
          .setHTML(name)
          .addTo(map);
      });
      map.on("click", "interactive-areas-fill", (event) => {
        if (isMarkerTarget(event.originalEvent.target)) return;
        const topFeatures = map.queryRenderedFeatures(event.point, {
          layers: ["street-furniture-circles"],
        });
        if (topFeatures.length > 0) return;
        const feature = event.features?.[0];
        const areaId = String(feature?.properties?.id ?? "");
        if (areaId && onAreaClick) onAreaClick(areaId);
      });

      const bindNaturalPopup = (layerId: string, label: string, propertyKeys: string[]) => {
        map.on("mouseenter", layerId, () => ensureCursor("pointer"));
        map.on("mouseleave", layerId, () => {
          ensureCursor("");
          naturalPopupRef.current?.remove();
        });
        map.on("mousemove", layerId, (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const name = propertyKeys
            .map((key) => String(feature.properties?.[key] ?? "").trim())
            .find(Boolean);
          if (!name) return;
          if (!naturalPopupRef.current) {
            naturalPopupRef.current = new maplibregl.Popup({
              closeButton: false,
              closeOnClick: false,
              className: "maplibre-tip-popup",
            });
          }
          naturalPopupRef.current
            .setLngLat(event.lngLat)
            .setHTML(`<strong>${label}</strong><br/>${name}`)
            .addTo(map);
        });
      };

      bindNaturalPopup("waterbodies-fill", "Waterbody", ["NAME_LABEL", "NAME"]);
      bindNaturalPopup("parks-fill", "Park", ["NAME_LABEL", "NAME"]);

      map.on("mouseenter", "street-furniture-circles", () => ensureCursor("pointer"));
      map.on("mouseleave", "street-furniture-circles", () => {
        ensureCursor("");
        naturalPopupRef.current?.remove();
      });
      map.on("click", "street-furniture-circles", (event) => {
        event.preventDefault();
      });
      map.on("mousemove", "street-furniture-circles", (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const label = String(feature.properties?.label ?? "").trim();
        const location = String(feature.properties?.location_desc ?? "").trim();
        if (!naturalPopupRef.current) {
          naturalPopupRef.current = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: "maplibre-tip-popup maplibre-furniture-popup",
          });
        }
        naturalPopupRef.current
          .setLngLat(event.lngLat)
          .setHTML(
            `<span class="furniture-tip-label">${label}</span>` +
            `<span class="furniture-tip-location">${location}</span>`
          )
          .addTo(map);
      });

      setLayerVisibility(["interactive-areas-fill", "interactive-areas-line"], showInteractiveAreas);
      setLayerVisibility(["waterbodies-fill", "waterbodies-line", "parks-fill", "parks-line"], showNaturalPlaces);
      setLayerVisibility(["street-furniture-circles"], showStreetFacilities);
    });

    return () => {
      loadedRef.current = false;
      areaPopupRef.current?.remove();
      naturalPopupRef.current?.remove();
      markerPopupRef.current?.remove();
      precinctMarkersRef.current.forEach((marker) => marker.remove());
      easePlaceMarkersRef.current.forEach((marker) => marker.remove());
      precinctMarkersRef.current = [];
      easePlaceMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [onAreaClick, onMapReady, showInteractiveAreas, showNaturalPlaces, showStreetFacilities]);

  useEffect(() => {
    fetch("/geoscape/municipal-boundary.geojson")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        boundaryDataRef.current = data;
        updateSource("municipal-boundary", data);
      })
      .catch((err: unknown) => {
        console.error("[MapLibreMap] failed to load municipal boundary", err);
      });

    fetch("/geoscape/interactive-areas.geojson")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        areaDataRef.current = data;
        updateSource("interactive-areas", data);
      })
      .catch((err: unknown) => {
        console.error("[MapLibreMap] failed to load interactive areas", err);
      });

    fetch("/geoscape/waterbodies.geojson")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        waterDataRef.current = data;
        updateSource("waterbodies", data);
      })
      .catch((err: unknown) => {
        console.error("[MapLibreMap] failed to load waterbody layer", err);
      });

    fetch("/geoscape/parks.geojson")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        parksDataRef.current = data;
        updateSource("parks", data);
      })
      .catch((err: unknown) => {
        console.error("[MapLibreMap] failed to load parks layer", err);
      });

    Promise.all([fetchFurniture("all", "all", 3000), fetchFurniture("all", "drinking_fountain", 3000)])
      .then(([allData, drinkingData]) => {
        const merged = [...(allData.features ?? []), ...(drinkingData.features ?? [])];
        const deduped = Array.from(
          new Map(
            merged.map((feature) => {
              const [lng, lat] = feature.geometry.coordinates;
              return [`${lat},${lng},${(feature.properties.asset_type || "").toLowerCase()}`, feature] as const;
            })
          ).values()
        );

        const grouped: Record<"bicycle" | "drinking" | "seat", FurnitureFeature[]> = {
          bicycle: [],
          drinking: [],
          seat: [],
        };

        deduped.forEach((feature) => {
          const kind = classifyFurnitureType(feature.properties.asset_type || "");
          if (!kind) return;
          grouped[kind].push(feature);
        });

        const target = grouped.drinking.length;
        const balanced = [
          ...grouped.drinking,
          ...grouped.bicycle.slice(0, target),
          ...grouped.seat.slice(0, target),
        ];

        furnitureDataRef.current = toFeatureCollection(
          balanced
            .map((feature) => {
              const [lng, lat] = feature.geometry.coordinates;
              if (!hasValidCoords(lat, lng)) return null;
              const style = furnitureStyle(feature.properties.asset_type || "");
              return {
                type: "Feature" as const,
                geometry: { type: "Point" as const, coordinates: [lng, lat] },
                properties: {
                  label: style.label,
                  location_desc: feature.properties.location_desc || "",
                  color: style.color,
                  radius: style.radius,
                },
              };
            })
            .filter(Boolean) as GeoJSON.Feature[]
        );
        updateSource("street-furniture", furnitureDataRef.current);
      })
      .catch((err: unknown) => {
        console.error("[MapLibreMap] failed to load street furniture points", err);
      });
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    easePlaceMarkersRef.current.forEach((marker) => marker.remove());
    easePlaceMarkersRef.current = [];

    EASE_PLACES_DATA.forEach((feature) => {
      const { core, halo } = easePlacesMarkerColor(feature.category);
      const el = document.createElement("button");
      el.type = "button";
      el.className = "maplibre-marker-button";
      el.style.width = "14px";
      el.style.height = "14px";
      el.style.borderRadius = "999px";
      el.style.border = "none";
      el.style.padding = "0";
      el.style.cursor = "pointer";
      el.style.background = core;
      el.style.boxShadow = `0 0 0 6px ${halo}`;
      el.title = feature.name;
      el.addEventListener("mouseenter", () => {
        markerPopupRef.current?.remove();
        markerPopupRef.current = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 14,
          className: "maplibre-tip-popup",
        })
          .setLngLat([feature.lng, feature.lat])
          .setHTML(feature.name)
          .addTo(map);
      });
      el.addEventListener("mouseleave", () => {
        markerPopupRef.current?.remove();
      });
      const stopMarkerEvent = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
      };
      el.addEventListener("pointerdown", stopMarkerEvent);
      el.addEventListener("mousedown", stopMarkerEvent);
      el.addEventListener("touchstart", stopMarkerEvent, { passive: false });
      el.addEventListener("click", (event) => {
        stopMarkerEvent(event);
        event.stopPropagation();
        const rect = map.getContainer().getBoundingClientRect();
        onEasePlacesClick?.(feature, {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([feature.lng, feature.lat])
        .addTo(map);
      if (!showEasePlaces) {
        marker.remove();
      }
      easePlaceMarkersRef.current.push(marker);
    });
  }, [onEasePlacesClick, showEasePlaces]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    precinctMarkersRef.current.forEach((marker) => marker.remove());
    precinctMarkersRef.current = [];

    const filtered = precincts.filter((precinct) => {
      if (!selectedCategory) return true;
      return riskLevel(precinct.comfort_label) === selectedCategory;
    });

    const validPrecincts = filtered.filter((precinct) => hasValidCoords(precinct.lat, precinct.lng));
    if (filtered.length > 0 && validPrecincts.length === 0) {
      console.warn("[MapLibreMap] no precinct markers rendered: all precinct coordinates invalid");
    }

    validPrecincts.forEach((precinct) => {
      const isStalePrecinct = precinct.stale_data || precinct.id === "flemington";
      const color = comfortColor(precinct.comfort_label, isStalePrecinct);
      const isCompared = precinct.id === compareSelection1 || precinct.id === compareSelection2;
      const wrapper = document.createElement("button");
      wrapper.type = "button";
      wrapper.className = "maplibre-marker-button";
      wrapper.title = `${precinct.name}: ${precinct.comfort_score}/100`;
      const staleMessage = isStalePrecinct ? '<br/><span style="color:#ef4444">Data outdated</span>' : "";
      wrapper.innerHTML = `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
          <div style="
            background:white;color:#111;font-size:10px;font-weight:700;
            padding:2px 6px;border-radius:4px;border:2px solid ${color};
            margin-bottom:2px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.18);
            ${isCompared ? "outline:3px solid #0ea5e9;" : ""}
          ">${precinct.comfort_score}</div>
          <svg width="28" height="32" viewBox="0 0 28 32" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 0C6.268 0 0 6.268 0 14c0 9.6 14 18 14 18s14-8.4 14-18C28 6.268 21.732 0 14 0z"
              fill="${color}" stroke="white" stroke-width="2"/>
            <circle cx="14" cy="13" r="5" fill="white" opacity="0.5"/>
          </svg>
          ${isStalePrecinct ? '<div style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;background:#ef4444;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:8px;color:white;font-weight:bold;">!</div>' : ""}
        </div>
      `;
      wrapper.addEventListener("mouseenter", () => {
        markerPopupRef.current?.remove();
        markerPopupRef.current = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 18,
          className: "maplibre-tip-popup",
        })
          .setLngLat([precinct.lng, precinct.lat])
          .setHTML(`<strong>${precinct.name}</strong><br/>Comfort: ${precinct.comfort_score}/100${staleMessage}`)
          .addTo(map);
      });
      wrapper.addEventListener("mouseleave", () => {
        markerPopupRef.current?.remove();
      });
      const stopMarkerEvent = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
      };
      wrapper.addEventListener("pointerdown", stopMarkerEvent);
      wrapper.addEventListener("mousedown", stopMarkerEvent);
      wrapper.addEventListener("touchstart", stopMarkerEvent, { passive: false });
      wrapper.addEventListener("click", (event) => {
        stopMarkerEvent(event);
        onPrecinctClick(precinct.id);
      });
      const marker = new maplibregl.Marker({ element: wrapper, anchor: "bottom" })
        .setLngLat([precinct.lng, precinct.lat])
        .addTo(map);
      precinctMarkersRef.current.push(marker);
    });
  }, [activeMode, compareSelection1, compareSelection2, onPrecinctClick, precincts, selectedCategory]);

  useEffect(() => {
    setLayerVisibility(["interactive-areas-fill", "interactive-areas-line"], showInteractiveAreas);
  }, [showInteractiveAreas]);

  useEffect(() => {
    setLayerVisibility(["street-furniture-circles"], showStreetFacilities);
  }, [showStreetFacilities]);

  useEffect(() => {
    setLayerVisibility(["waterbodies-fill", "waterbodies-line", "parks-fill", "parks-line"], showNaturalPlaces);
  }, [showNaturalPlaces]);

  useEffect(() => {
    easePlaceMarkersRef.current.forEach((marker) => {
      const element = marker.getElement();
      element.style.display = showEasePlaces ? "" : "none";
    });
  }, [showEasePlaces]);

  return (
    <div
      ref={containerRef}
      style={{ height: "clamp(420px, calc(100vh - 230px), 680px)", width: "100%", zIndex: 0 }}
    />
  );
}
