import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { EASE_PLACES_DATA, easePlacesMarkerColor, type EasePlacesFeature } from "../lib/easePlaces";
import { AUSTRALIA_REGION_MAX_BOUNDS } from "../lib/melbourneRegion";
import {
  classifySupportedFacility,
  fetchSupportedFacilitiesCatalog,
  getSupportedFacilityTypeLabel,
  type SupportedFacilityKind,
} from "../lib/streetFacilities";
import { DEFAULT_ROUTE_PET_CONFIG } from "../lib/routePet";

export const MELBOURNE_CENTER: [number, number] = [144.9631, -37.8136];

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
} as const;

const MAPBOX_STANDARD_STYLE = "mapbox://styles/mapbox/standard";
const STANDARD_BASEMAP_CONFIG = {
  lightPreset: "day",
  show3dObjects: true,
  show3dBuildings: true,
  show3dLandmarks: true,
  show3dTrees: true,
  show3dFacades: true,
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

export type RoutePlaybackMode = "idle" | "autoplay" | "live";

export type MapViewportControls = {
  zoomIn: () => void;
  zoomOut: () => void;
};

type WhiteModelMapProps = {
  mapboxToken: string | null;
  startPoint: RoutePoint | null;
  endPoint: RoutePoint | null;
  route: RouteSummary | null;
  routeProgress: number | null;
  routePlaybackMode: RoutePlaybackMode;
  followPet: boolean;
  liveTrackedPoint?: RoutePoint | null;
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

function createPetMarkerElement() {
  const petConfig = DEFAULT_ROUTE_PET_CONFIG;
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-testid", "route-pet-marker");
  wrapper.setAttribute("data-pet-mode", petConfig.mode);
  wrapper.style.width = `${petConfig.widthPx}px`;
  wrapper.style.height = `${petConfig.heightPx}px`;
  wrapper.style.position = "relative";
  wrapper.style.display = "grid";
  wrapper.style.placeItems = "center";
  wrapper.style.pointerEvents = "none";
  wrapper.style.willChange = "transform";
  wrapper.style.transform = "translateZ(0)";

  const halo = document.createElement("div");
  halo.style.position = "absolute";
  halo.style.inset = `${petConfig.haloInsetPx}px`;
  halo.style.borderRadius = "999px";
  halo.style.background = "radial-gradient(circle, rgba(79,209,197,0.3) 0%, rgba(79,209,197,0.12) 55%, rgba(79,209,197,0) 100%)";
  halo.style.animation = "route-pet-pulse 1.8s ease-in-out infinite";
  halo.style.willChange = "transform, opacity";

  let petVisual: HTMLElement;
  if (petConfig.mode === "spritesheet") {
    const sprite = document.createElement("div");
    sprite.className = "route-pet-sprite";
    sprite.setAttribute("aria-hidden", petConfig.alt ? "false" : "true");
    sprite.style.width = `${petConfig.imageWidthPx}px`;
    sprite.style.height = `${petConfig.imageHeightPx}px`;
    sprite.style.backgroundImage = `url(${petConfig.assetUrl})`;
    sprite.style.backgroundRepeat = "no-repeat";
    sprite.style.backgroundSize = `${petConfig.imageWidthPx * (petConfig.frameColumns ?? 1)}px ${petConfig.imageHeightPx * (petConfig.frameRows ?? 1)}px`;
    sprite.style.backgroundPosition = "0px 0px";
    sprite.style.filter = "drop-shadow(0 10px 18px rgba(11,24,24,0.28))";
    sprite.style.animation = "route-pet-bob 1.2s ease-in-out infinite";
    sprite.style.willChange = "transform, background-position";
    sprite.style.transform = "translateZ(0)";
    petVisual = sprite;

    petConfig
      .loadAssetUrl?.()
      .then((assetUrl) => {
        sprite.style.backgroundImage = `url(${assetUrl})`;
      })
      .catch((error: unknown) => {
        console.warn("[WhiteModelMap] failed to lazy-load the route pet spritesheet", error);
      });
  } else {
    const img = document.createElement("img");
    img.src = petConfig.assetUrl;
    img.alt = petConfig.alt;
    if (!petConfig.alt) {
      img.setAttribute("aria-hidden", "true");
    }
    img.style.width = `${petConfig.imageWidthPx}px`;
    img.style.height = `${petConfig.imageHeightPx}px`;
    img.style.display = "block";
    img.style.filter = "drop-shadow(0 10px 18px rgba(11,24,24,0.28))";
    img.style.animation = "route-pet-bob 1.2s ease-in-out infinite";
    img.style.willChange = "transform";
    img.style.transform = "translateZ(0)";
    petVisual = img;
  }

  wrapper.appendChild(halo);
  wrapper.appendChild(petVisual);
  return wrapper;
}

function clampProgress(progress: number) {
  return Math.max(0, Math.min(1, progress));
}

function lineDistance(start: [number, number], end: [number, number]) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  return Math.hypot(dx, dy);
}

function interpolateCoord(start: [number, number], end: [number, number], ratio: number): [number, number] {
  return [start[0] + (end[0] - start[0]) * ratio, start[1] + (end[1] - start[1]) * ratio];
}

function splitRouteGeometry(geometry: GeoJSON.LineString, progress: number) {
  const coordinates = geometry.coordinates as [number, number][];
  if (coordinates.length === 0) {
    return {
      traveled: { type: "LineString", coordinates: [] } satisfies GeoJSON.LineString,
      remaining: { type: "LineString", coordinates: [] } satisfies GeoJSON.LineString,
      point: null as RoutePoint | null,
    };
  }

  if (coordinates.length === 1) {
    const [lng, lat] = coordinates[0];
    return {
      traveled: { type: "LineString", coordinates: [coordinates[0], coordinates[0]] } satisfies GeoJSON.LineString,
      remaining: { type: "LineString", coordinates: [coordinates[0], coordinates[0]] } satisfies GeoJSON.LineString,
      point: { lng, lat },
    };
  }

  const clampedProgress = clampProgress(progress);
  const segmentLengths = coordinates.slice(0, -1).map((coord, index) => lineDistance(coord, coordinates[index + 1]));
  const totalLength = segmentLengths.reduce((sum, value) => sum + value, 0);

  if (totalLength === 0) {
    const [lng, lat] = coordinates[0];
    return {
      traveled: { type: "LineString", coordinates: [coordinates[0], coordinates[0]] } satisfies GeoJSON.LineString,
      remaining: { type: "LineString", coordinates: [coordinates[0], coordinates.at(-1) ?? coordinates[0]] } satisfies GeoJSON.LineString,
      point: { lng, lat },
    };
  }

  const targetLength = totalLength * clampedProgress;
  let accumulated = 0;

  for (let index = 0; index < segmentLengths.length; index += 1) {
    const segmentLength = segmentLengths[index];
    const nextAccumulated = accumulated + segmentLength;
    if (targetLength <= nextAccumulated || index === segmentLengths.length - 1) {
      const start = coordinates[index];
      const end = coordinates[index + 1];
      const ratio = segmentLength === 0 ? 0 : (targetLength - accumulated) / segmentLength;
      const splitPoint = interpolateCoord(start, end, ratio);
      return {
        traveled: {
          type: "LineString",
          coordinates: [...coordinates.slice(0, index + 1), splitPoint],
        } satisfies GeoJSON.LineString,
        remaining: {
          type: "LineString",
          coordinates: [splitPoint, ...coordinates.slice(index + 1)],
        } satisfies GeoJSON.LineString,
        point: { lng: splitPoint[0], lat: splitPoint[1] },
      };
    }
    accumulated = nextAccumulated;
  }

  const end = coordinates.at(-1) ?? coordinates[0];
  return {
    traveled: { type: "LineString", coordinates: [...coordinates] } satisfies GeoJSON.LineString,
    remaining: { type: "LineString", coordinates: [end, end] } satisfies GeoJSON.LineString,
    point: { lng: end[0], lat: end[1] },
  };
}

function isRecoverableMapboxError(error: unknown) {
  const candidate = error as {
    status?: number;
    message?: string;
    error?: { status?: number; message?: string };
  } | null;
  const status = candidate?.status ?? candidate?.error?.status;
  const message = (candidate?.message ?? candidate?.error?.message ?? "").toLowerCase();

  if (status === 404 && (message.includes("procedural-buildings") || message.includes("could not load models"))) {
    return true;
  }

  if (message.includes("could not load models") || message.includes("procedural-buildings")) {
    return true;
  }

  return false;
}

function easeInOutSine(progress: number) {
  return -(Math.cos(Math.PI * progress) - 1) / 2;
}

function resolvePetSpriteRow(
  routePlaybackMode: RoutePlaybackMode,
  direction: "left" | "right",
  isMoving: boolean
) {
  if (routePlaybackMode === "idle") return 0;
  if (routePlaybackMode === "live" && !isMoving) return 8;
  if (routePlaybackMode === "live" && isMoving) return 7;
  return direction === "left" ? 2 : 1;
}

function resolvePetDirection(
  geometry: GeoJSON.LineString,
  progress: number | null,
  fallbackDirection: "left" | "right" = "right"
) {
  const coordinates = geometry.coordinates as [number, number][];
  if (coordinates.length < 2) return fallbackDirection;
  const clampedProgress = clampProgress(typeof progress === "number" ? progress : 0);
  const segmentLengths = coordinates.slice(0, -1).map((coord, index) => lineDistance(coord, coordinates[index + 1]));
  const totalLength = segmentLengths.reduce((sum, value) => sum + value, 0);
  if (totalLength === 0) {
    return coordinates.at(-1)?.[0] ?? 0 < coordinates[0][0] ? "left" : "right";
  }

  const targetLength = totalLength * clampedProgress;
  let accumulated = 0;
  for (let index = 0; index < segmentLengths.length; index += 1) {
    const nextAccumulated = accumulated + segmentLengths[index];
    if (targetLength <= nextAccumulated || index === segmentLengths.length - 1) {
      return coordinates[index + 1][0] < coordinates[index][0] ? "left" : "right";
    }
    accumulated = nextAccumulated;
  }

  return fallbackDirection;
}

function updatePetMarkerPresentation(
  element: HTMLElement,
  routePlaybackMode: RoutePlaybackMode,
  direction: "left" | "right",
  isMoving: boolean
) {
  const petConfig = DEFAULT_ROUTE_PET_CONFIG;
  element.dataset.playbackMode = routePlaybackMode;
  element.dataset.direction = direction;
  element.dataset.moving = String(isMoving);
  if (petConfig.mode !== "spritesheet") return;

  const sprite = element.querySelector<HTMLElement>(".route-pet-sprite");
  if (!sprite) return;

  const row = resolvePetSpriteRow(routePlaybackMode, direction, isMoving);
  const frameWidth = petConfig.imageWidthPx;
  const frameHeight = petConfig.imageHeightPx;
  const nextRow = String(row);
  const nextAnimation = routePlaybackMode === "idle"
    ? "route-pet-bob 1.4s ease-in-out infinite"
    : row === 8
      ? "route-pet-bob 1.35s ease-in-out infinite"
      : "route-pet-scooter-frames 1.25s steps(8) infinite, route-pet-bob 1.25s ease-in-out infinite";
  const nextBackgroundPositionY = `${-row * frameHeight}px`;

  if (element.dataset.spriteRow !== nextRow) {
    element.dataset.spriteRow = nextRow;
    sprite.dataset.spriteRow = nextRow;
    sprite.style.backgroundPositionY = nextBackgroundPositionY;
  }

  if (sprite.dataset.animationName !== nextAnimation) {
    sprite.dataset.animationName = nextAnimation;
    sprite.style.animation = nextAnimation;
  }

  if (sprite.style.transform !== "translateZ(0)") {
    sprite.style.transform = "translateZ(0)";
  }

  const nextFrameWidth = `${frameWidth}px`;
  if (sprite.style.getPropertyValue("--route-pet-frame-width") !== nextFrameWidth) {
    sprite.style.setProperty("--route-pet-frame-width", nextFrameWidth);
  }
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
  routeProgress,
  routePlaybackMode,
  followPet,
  liveTrackedPoint = null,
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
  const petMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const petMarkerElementRef = useRef<HTMLElement | null>(null);
  const petMarkerStateRef = useRef<{ point: RoutePoint; progress: number | null } | null>(null);
  const petMarkerAttachedRef = useRef(false);
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
  const routeProgressRef = useRef(routeProgress);
  const routePlaybackModeRef = useRef(routePlaybackMode);
  const routeGeometryRef = useRef<GeoJSON.LineString | null>(null);
  const hasFocusedInitialRouteRef = useRef(false);
  const followPetRef = useRef(followPet);
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
    routeGeometryRef.current = null;
  };

  const ensureRouteSourcesAndLayers = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const emptyFeature = {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: [] },
    };

    if (!map.getSource(SOURCE_IDS.route)) {
      map.addSource(SOURCE_IDS.route, {
        type: "geojson",
        data: emptyFeature,
      });
    }

    if (!map.getLayer(LAYER_IDS.routeCasing)) {
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
          "line-opacity": 0.58,
        },
      });
    }

    if (!map.getLayer(LAYER_IDS.route)) {
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
          "line-opacity": 0.74,
        },
      });
    }

    ensureRouteOnTop();
  };

  const drawRoute = (geometry: GeoJSON.LineString, progress: number | null) => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return null;

    ensureRouteSourcesAndLayers();

    const split = splitRouteGeometry(geometry, typeof progress === "number" ? progress : 0);
    const routeSource = map.getSource(SOURCE_IDS.route) as mapboxgl.GeoJSONSource | undefined;
    if (routeGeometryRef.current !== geometry) {
      routeSource?.setData({
        type: "Feature",
        properties: {},
        geometry,
      });
      routeGeometryRef.current = geometry;
    }

    return split.point;
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

  const maybeFollowPet = (point: RoutePoint) => {
    const map = mapRef.current;
    if (!map || !followPetRef.current || routePlaybackModeRef.current === "idle") return;
    const container = map.getContainer();
    if (!container.clientWidth || !container.clientHeight || !map.isStyleLoaded()) return;

    let projected: { x: number; y: number } | null = null;
    try {
      projected = map.project([point.lng, point.lat]);
    } catch (error) {
      console.warn("[WhiteModelMap] skipping pet follow because projection is not ready", error);
      return;
    }
    if (!projected) return;

    const horizontalMargin = container.clientWidth * 0.22;
    const verticalMargin = container.clientHeight * 0.24;
    const insideSafeBounds =
      projected.x >= horizontalMargin &&
      projected.x <= container.clientWidth - horizontalMargin &&
      projected.y >= verticalMargin &&
      projected.y <= container.clientHeight - verticalMargin;

    if (insideSafeBounds) return;

    map.easeTo({
      center: [point.lng, point.lat],
      duration: 650,
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
    routeProgressRef.current = routeProgress;
  }, [routeProgress]);

  useEffect(() => {
    routePlaybackModeRef.current = routePlaybackMode;
  }, [routePlaybackMode]);

  useEffect(() => {
    if (!route) {
      hasFocusedInitialRouteRef.current = false;
    }
  }, [route]);

  useEffect(() => {
    showEasePlacesRef.current = showEasePlaces;
  }, [showEasePlaces]);

  useEffect(() => {
    followPetRef.current = followPet;
  }, [followPet]);

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
      style: MAPBOX_STANDARD_STYLE,
      config: {
        basemap: { ...STANDARD_BASEMAP_CONFIG },
      },
      maxBounds: AUSTRALIA_REGION_MAX_BOUNDS as [[number, number], [number, number]],
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
      if (isRecoverableMapboxError(event.error)) {
        console.warn("[WhiteModelMap] ignoring recoverable Mapbox resource error", event.error);
        return;
      }
      const status = (event.error as { status?: number } | undefined)?.status;
      const detail = status ? ` Mapbox returned status ${status}.` : "";
      onMapErrorRef.current(`The 3D map could not load.${detail} Check the Mapbox public token and try again.`);
    });

    map.on("style.load", () => {
      const style = map.getStyle();
      for (const [property, value] of Object.entries(STANDARD_BASEMAP_CONFIG)) {
        map.setConfigProperty("basemap", property, value);
      }

      const labelLayerId = (style.layers ?? []).find(
        (layer) =>
          layer.type === "symbol" &&
          (layer as { layout?: { ["text-field"]?: unknown } }).layout?.["text-field"]
      )?.id;

      addNaturalLayers(map, showNaturalPlacesRef.current, labelLayerId);

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
        drawRoute(routeRef.current.geometry, routeProgressRef.current);
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
      petMarkerRef.current?.remove();
      focusedStepMarkerRef.current?.remove();
      removePopup(naturalPopupRef);
      removePopup(easePlacesPopupRef);
      removePopup(streetFacilitiesPopupRef);
      removeRoute();
      map.remove();
      mapRef.current = null;
      startMarkerRef.current = null;
      endMarkerRef.current = null;
      petMarkerRef.current = null;
      petMarkerElementRef.current = null;
      petMarkerStateRef.current = null;
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
      petMarkerRef.current?.remove();
      petMarkerRef.current = null;
      petMarkerElementRef.current = null;
      petMarkerStateRef.current = null;
      return;
    }

    const drawAndFocusRoute = () => {
      if (!mapRef.current || mapRef.current !== map || routeRef.current !== route || !map.isStyleLoaded()) {
        return;
      }
      drawRoute(route.geometry, routeProgressRef.current);
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
    if (!map || !route) {
      petMarkerRef.current?.remove();
      petMarkerRef.current = null;
      petMarkerAttachedRef.current = false;
      return;
    }

    const activePoint = drawRoute(route.geometry, routeProgress);
    const markerPoint = routePlaybackMode === "live" && liveTrackedPoint ? liveTrackedPoint : activePoint;
    if (!markerPoint || typeof routeProgress !== "number") {
      petMarkerRef.current?.remove();
      petMarkerRef.current = null;
      petMarkerAttachedRef.current = false;
      petMarkerStateRef.current = null;
      return;
    }

    if (!petMarkerRef.current) {
      petMarkerElementRef.current = createPetMarkerElement();
      petMarkerRef.current = new mapboxgl.Marker({
        element: petMarkerElementRef.current,
        anchor: "center",
      });
    }

    const direction = resolvePetDirection(route.geometry, routeProgress);
    const previousState = petMarkerStateRef.current;
    const deltaProgress = previousState?.progress === null || previousState?.progress === undefined
      ? Math.abs(routeProgress)
      : Math.abs(routeProgress - previousState.progress);
    const deltaDistance =
      previousState
        ? Math.hypot(markerPoint.lng - previousState.point.lng, markerPoint.lat - previousState.point.lat)
        : Number.POSITIVE_INFINITY;
    const isMoving = deltaProgress > 0.0005 || deltaDistance > 0.00001;
    if (petMarkerElementRef.current) {
      updatePetMarkerPresentation(petMarkerElementRef.current, routePlaybackMode, direction, isMoving);
    }
    petMarkerRef.current.setLngLat([markerPoint.lng, markerPoint.lat]);
    if (!petMarkerAttachedRef.current) {
      petMarkerRef.current.addTo(map);
      petMarkerAttachedRef.current = true;
    }
    petMarkerStateRef.current = { point: markerPoint, progress: routeProgress };
    maybeFollowPet(markerPoint);
  }, [route, routeProgress, routePlaybackMode, followPet, liveTrackedPoint]);

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

  return (
    <>
      <style>
        {`
          @keyframes route-pet-bob {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }

          @keyframes route-pet-pulse {
            0%, 100% { transform: scale(0.92); opacity: 0.62; }
            50% { transform: scale(1.04); opacity: 1; }
          }

          @keyframes route-pet-scooter-frames {
            from { background-position-x: 0px; }
            to { background-position-x: calc(var(--route-pet-frame-width, 52px) * -8); }
          }
        `}
      </style>
      <div ref={containerRef} className="route-3d-map" style={{ minHeight: "100dvh", width: "100%", touchAction: "none" }} />
    </>
  );
}
