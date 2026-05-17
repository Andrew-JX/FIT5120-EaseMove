import {
  AlertTriangle,
  ArrowLeft,
  Bike,
  ChevronLeft,
  ChevronRight,
  Footprints,
  Layers3,
  Loader2,
  LocateFixed,
  MapPinned,
  Minus,
  Navigation,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import AppTopNav from "../components/AppTopNav";
import WhiteModelMap, {
  type MapViewportControls,
  type RoutePoint,
  type RouteProfile,
  type RouteStepItem,
  type RouteSummary,
} from "../components/WhiteModelMap";
import EasePlacesDetailPopup from "../components/map/EasePlacesDetailPopup";
import { type EasePlacesFeature } from "../lib/easePlaces";
import { isPointInSupportedRegion, AUSTRALIA_REGION_ERROR } from "../lib/melbourneRegion";
import { APP_ROUTES } from "../lib/navigation";

const MAPBOX_PUBLIC_TOKEN = (import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined)?.trim() || null;
const ROUTE_REQUEST_TIMEOUT_MS = 12000;
const LOW_ACCURACY_THRESHOLD_METERS = 120;
const MOBILE_PANEL_MEDIA_QUERY = "(max-width: 767px)";
let hasAutoShownRouteGuideThisRuntime = false;
const liquidGlassPanelStyle: CSSProperties = {
  background:
    "radial-gradient(circle at 18% 0%, rgba(255,255,255,0.52), transparent 36%), linear-gradient(135deg, rgba(247,255,253,0.5), rgba(237,246,249,0.32) 54%, rgba(255,248,232,0.24))",
  backdropFilter: "url(#route-liquid-glass-filter) blur(16px) saturate(1.42) brightness(1.06)",
  WebkitBackdropFilter: "blur(16px) saturate(1.42) brightness(1.06)",
  boxShadow:
    "0 26px 64px rgba(4,14,14,0.16), inset 0 1px 0 rgba(255,255,255,0.68), inset 0 -18px 42px rgba(23,65,63,0.08), inset 1px 0 0 rgba(255,255,255,0.24)",
};

const routeToolbarStyle: CSSProperties = {
  background:
    "radial-gradient(circle at 14% 0%, rgba(255,255,255,0.54), transparent 34%), linear-gradient(135deg, rgba(248,255,253,0.56), rgba(236,245,248,0.36) 56%, rgba(255,247,234,0.24))",
  backdropFilter: "url(#route-liquid-glass-filter) blur(18px) saturate(1.2) brightness(1.03)",
  WebkitBackdropFilter: "blur(18px) saturate(1.2) brightness(1.03)",
  boxShadow:
    "0 18px 42px rgba(4,14,14,0.14), inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -12px 24px rgba(23,65,63,0.06)",
};

const liquidGlassCardClass =
  "border border-white/45 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.42),transparent_38%),linear-gradient(145deg,rgba(255,255,255,0.4),rgba(237,246,249,0.22))] shadow-[inset_0_1px_0_rgba(255,255,255,0.64),inset_0_-12px_24px_rgba(176,186,191,0.08),0_14px_32px_rgba(4,14,14,0.07)]";

const liquidGlassInteractiveClass =
  `${liquidGlassCardClass} transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-white/72 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.48),rgba(237,246,249,0.24))] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_18px_42px_rgba(4,14,14,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#83c5be]/70`;

const floatingChromeButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full border border-white/42 bg-white/72 text-sm font-semibold text-[#17413f] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_10px_24px_rgba(23,65,63,0.14)] backdrop-blur-md transition hover:bg-white active:scale-[0.98]";

type RouteError = {
  title: string;
  message: string;
};

type AreaLayerState = {
  easePlaces: boolean;
  naturalPlaces: boolean;
  streetFacilities: boolean;
  activityDensity: boolean;
};

type PanelView = "route" | "layers" | null;

type DirectionsResponse = {
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: GeoJSON.LineString;
    legs: Array<{
      steps?: Array<{
        distance: number;
        name: string;
        maneuver: {
          instruction: string;
          modifier?: string;
          type: string;
          location?: [number, number];
        };
      }>;
    }>;
  }>;
  message?: string;
};

type GeolocationState =
  | { status: "idle"; message: string | null }
  | { status: "loading"; message: string | null }
  | { status: "success"; message: string | null }
  | { status: "warning"; message: string }
  | { status: "error"; message: string };

type DisabledActivityDensityState = {
  date: string | null;
  availableHours: number[];
  selectedHour: number | null;
  features: Array<{ hourday: number }>;
  loading: boolean;
  loaded: boolean;
  error: string | null;
};

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function formatPoint(point: RoutePoint) {
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}

function formatHourLabel(hour: number) {
  return `${hour.toString().padStart(2, "0")}:00`;
}

function parsePointFromSearch(search: string, prefix: "start" | "end"): RoutePoint | null {
  const params = new URLSearchParams(search);
  const rawLat = params.get(`${prefix}Lat`);
  const rawLng = params.get(`${prefix}Lng`);
  if (rawLat === null || rawLng === null) return null;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function shouldAutoLocateStart(search: string): boolean {
  return new URLSearchParams(search).get("autoLocateStart") === "1";
}

type LayerLegendFilters = {
  easePlaces: boolean;
  naturalPlaces: boolean;
  streetFacilities: boolean;
};

function buildRouteUrl(profile: RouteProfile, startPoint: RoutePoint, endPoint: RoutePoint) {
  const start = `${startPoint.lng},${startPoint.lat}`;
  const end = `${endPoint.lng},${endPoint.lat}`;
  const params = new URLSearchParams({
    geometries: "geojson",
    overview: "full",
    steps: "true",
    access_token: MAPBOX_PUBLIC_TOKEN ?? "",
  });
  return `https://api.mapbox.com/directions/v5/mapbox/${profile}/${start};${end}?${params.toString()}`;
}

function parseRoute(data: DirectionsResponse, profile: RouteProfile): RouteSummary {
  const route = data.routes?.[0];
  if (!route) {
    throw new Error(data.message || "No route was returned for those two points.");
  }

  const steps: RouteStepItem[] = route.legs.flatMap((leg) =>
    (leg.steps ?? []).map((step) => ({
      instruction: step.maneuver.instruction,
      modifier: step.maneuver.modifier ?? null,
      type: step.maneuver.type,
      distanceMeters: step.distance,
      roadName: step.name,
      maneuverPoint:
        Array.isArray(step.maneuver.location) && step.maneuver.location.length === 2
          ? { lng: step.maneuver.location[0], lat: step.maneuver.location[1] }
          : null,
    }))
  );

  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    steps,
    profile,
    geometry: route.geometry,
  };
}

function geolocationMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission was denied. You can still click the map to choose a start point.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Your location is currently unavailable. Try again later or select a start point manually.";
  }
  if (error.code === error.TIMEOUT) {
    return "Finding your location timed out. You can retry or click the map to choose a start point.";
  }
  return "We could not read your location. You can still select points manually.";
}

function isMobilePanelViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_PANEL_MEDIA_QUERY).matches;
}

export default function Map3DExperimentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialIsMobileViewport = isMobilePanelViewport();
  const [profile, setProfile] = useState<RouteProfile>("walking");
  const [startPoint, setStartPoint] = useState<RoutePoint | null>(null);
  const [endPoint, setEndPoint] = useState<RoutePoint | null>(null);
  const [route, setRoute] = useState<RouteSummary | null>(null);
  const [routeError, setRouteError] = useState<RouteError | null>(() =>
    MAPBOX_PUBLIC_TOKEN
      ? null
      : {
          title: "Mapbox token missing",
          message: "Add VITE_MAPBOX_PUBLIC_TOKEN to the frontend environment to load the 3D map and routes.",
        }
  );
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelView>(initialIsMobileViewport ? null : "route");
  const [isMobileViewport, setIsMobileViewport] = useState(initialIsMobileViewport);
  const [showGuide, setShowGuide] = useState(false);
  const [landingMenuOpen, setLandingMenuOpen] = useState(false);
  const [mapViewportControls, setMapViewportControls] = useState<MapViewportControls | null>(null);
  const [isMapPointSelectionEnabled, setIsMapPointSelectionEnabled] = useState(true);
  const [mobileSheetMode, setMobileSheetMode] = useState<"expanded" | "peek">("expanded");
  const [mobileSheetHeight, setMobileSheetHeight] = useState(0);
  const [focusedStepIndex, setFocusedStepIndex] = useState<number | null>(null);
  const [areaLayers, setAreaLayers] = useState<AreaLayerState>({
    easePlaces: false,
    naturalPlaces: false,
    streetFacilities: false,
    activityDensity: false,
  });
  const [selectedEasePlace, setSelectedEasePlace] = useState<{
    feature: EasePlacesFeature;
    point: { x: number; y: number };
    viewport: { width: number; height: number };
  } | null>(null);
  const [geolocation, setGeolocation] = useState<GeolocationState>({
    status: "idle",
    message: null,
  });
  const requestIdRef = useRef(0);
  const hasAppliedSearchRef = useRef(false);
  const sheetRef = useRef<HTMLElement | null>(null);

  const routeReady = Boolean(route && startPoint && endPoint);
  const canUseRouteApi = Boolean(MAPBOX_PUBLIC_TOKEN);

  const showOutsideRegionError = useCallback(() => {
    setRouteError({
      title: AUSTRALIA_REGION_ERROR.title,
      message: AUSTRALIA_REGION_ERROR.message,
    });
  }, []);

  const isSupportedPoint = useCallback((point: RoutePoint) => isPointInSupportedRegion(point), []);

  const clearRouteOnly = useCallback(() => {
    requestIdRef.current += 1;
    setRoute(null);
    setIsRouteLoading(false);
  }, []);

  const requestRoute = useCallback(
    async (nextProfile: RouteProfile, nextStart: RoutePoint, nextEnd: RoutePoint) => {
      if (!isSupportedPoint(nextStart) || !isSupportedPoint(nextEnd)) {
        setRoute(null);
        setIsRouteLoading(false);
        showOutsideRegionError();
        return;
      }

      if (!MAPBOX_PUBLIC_TOKEN) {
        setRoute(null);
        setIsRouteLoading(false);
        setRouteError({
          title: "Mapbox token missing",
          message: "Routes need VITE_MAPBOX_PUBLIC_TOKEN. Select points still works once the map token is configured.",
        });
        return;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), ROUTE_REQUEST_TIMEOUT_MS);

      setIsRouteLoading(true);
      setRoute(null);
      setRouteError(null);

      try {
        const response = await fetch(buildRouteUrl(nextProfile, nextStart, nextEnd), {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Directions API returned ${response.status}.`);
        }

        const data = (await response.json()) as DirectionsResponse;
        const nextRoute = parseRoute(data, nextProfile);

        if (requestIdRef.current !== requestId) return;
        setRoute(nextRoute);
      } catch (error) {
        if (requestIdRef.current !== requestId) return;
        const isAbort = error instanceof DOMException && error.name === "AbortError";
        setRoute(null);
        setRouteError({
          title: isAbort ? "Route request timed out" : "Route could not be loaded",
          message: isAbort
            ? "The routing service took too long to respond. Try another point or switch travel mode."
            : error instanceof Error
              ? `${error.message} You can reselect points or switch travel mode without reloading.`
              : "The routing service failed. You can reselect points or switch travel mode without reloading.",
        });
      } finally {
        window.clearTimeout(timeoutId);
        if (requestIdRef.current === requestId) {
          setIsRouteLoading(false);
        }
      }
    },
    [isSupportedPoint, showOutsideRegionError]
  );

  const handleMapClick = useCallback(
    (point: RoutePoint) => {
      if (!isMapPointSelectionEnabled) return;
      if (!isSupportedPoint(point)) {
        showOutsideRegionError();
        return;
      }
      setFocusedStepIndex(null);
      setGeolocation((current) => (current.status === "loading" ? current : { status: "idle", message: null }));
      setRouteError(null);

      if (!startPoint || (startPoint && endPoint)) {
        setActivePanel(isMobileViewport ? null : "route");
        requestIdRef.current += 1;
        setStartPoint(point);
        setEndPoint(null);
        setRoute(null);
        setIsRouteLoading(false);
        return;
      }

      setActivePanel("route");
      setEndPoint(point);
      void requestRoute(profile, startPoint, point);
    },
    [endPoint, isMapPointSelectionEnabled, isMobileViewport, isSupportedPoint, profile, requestRoute, showOutsideRegionError, startPoint]
  );

  const handleProfileChange = useCallback(
    (nextProfile: RouteProfile) => {
      setActivePanel("route");
      setFocusedStepIndex(null);
      setProfile(nextProfile);
      if (startPoint && endPoint) {
        void requestRoute(nextProfile, startPoint, endPoint);
      }
    },
    [endPoint, requestRoute, startPoint]
  );

  const handleDeleteStart = useCallback(() => {
    clearRouteOnly();
    setFocusedStepIndex(null);
    setStartPoint(null);
    setEndPoint(null);
    setRouteError(null);
  }, [clearRouteOnly]);

  const handleDeleteEnd = useCallback(() => {
    clearRouteOnly();
    setFocusedStepIndex(null);
    setEndPoint(null);
    setRouteError(null);
  }, [clearRouteOnly]);

  const handleUseCurrentLocation = useCallback((targetEndPoint: RoutePoint | null = endPoint) => {
    setFocusedStepIndex(null);
    if (!navigator.geolocation) {
      setGeolocation({
        status: "error",
        message: "This browser does not support location. Click the map to choose a start point manually.",
      });
      return;
    }

    setGeolocation({ status: "loading", message: "Finding your current location..." });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          lng: position.coords.longitude,
          lat: position.coords.latitude,
        };
        if (!isSupportedPoint(point)) {
          clearRouteOnly();
          setRouteError({
            title: AUSTRALIA_REGION_ERROR.title,
            message: AUSTRALIA_REGION_ERROR.message,
          });
          setGeolocation({
            status: "error",
            message: "Your current location is outside the supported Australia area for this 3D route preview.",
          });
          return;
        }
        clearRouteOnly();
        setStartPoint(point);
        setRouteError(null);
        if (targetEndPoint) {
          setActivePanel("route");
          void requestRoute(profile, point, targetEndPoint);
        } else {
          setActivePanel(isMobileViewport ? null : "route");
        }

        if (position.coords.accuracy > LOW_ACCURACY_THRESHOLD_METERS) {
          setGeolocation({
            status: "warning",
            message: `Location found, but accuracy is about ${Math.round(position.coords.accuracy)} m. Adjust by clicking the map if needed.`,
          });
          return;
        }

        setGeolocation({
          status: "success",
          message: "Current location set as the start point.",
        });
      },
      (error) => {
        setGeolocation({
          status: "error",
          message: geolocationMessage(error),
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, [clearRouteOnly, endPoint, isMobileViewport, isSupportedPoint, profile, requestRoute]);

  const handleMapError = useCallback((message: string) => {
    setRouteError({
      title: "3D map problem",
      message,
    });
  }, []);

  const handleEasePlaceSelect = useCallback((
    feature: EasePlacesFeature,
    point: { x: number; y: number },
    viewport: { width: number; height: number }
  ) => {
    setSelectedEasePlace({ feature, point, viewport });
  }, []);

  const currentInstruction = useMemo(() => {
    if (!canUseRouteApi) return "Configure the Mapbox public token before using the 3D route preview.";
    if (!isMapPointSelectionEnabled) return "Point picking is locked. Turn the map point toggle back on before selecting a new start or end point.";
    if (!startPoint) return "Click the map once to set a start point.";
    if (!endPoint) return "Click the map again to set the destination.";
    if (isRouteLoading) return `Loading the default ${profile} route...`;
    if (routeReady) return "Route preview is ready.";
    return "Reselect points or switch travel mode to try again.";
  }, [canUseRouteApi, endPoint, isMapPointSelectionEnabled, isRouteLoading, profile, routeReady, startPoint]);

  const panelHasDenseContent = Boolean(route || routeError || isRouteLoading);
  const activeLayerCount =
    Number(areaLayers.easePlaces) + Number(areaLayers.naturalPlaces) + Number(areaLayers.streetFacilities);
  const panelCollapsed = activePanel === null;
  const activityDensity: DisabledActivityDensityState = useMemo(
    () => ({
      date: null,
      availableHours: [],
      selectedHour: null,
      features: [],
      loading: false,
      loaded: false,
      error: null,
    }),
    []
  );
  const visibleActivityFeatures: Array<{ hourday: number }> = [];
  const activityStatusLabel = "";

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(APP_ROUTES.map);
  }, [navigate]);

  const handleLayerToggle = useCallback((key: keyof AreaLayerState) => {
    setActivePanel("layers");
    setAreaLayers((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }, []);

  const openPanel = useCallback((panel: Exclude<PanelView, null>) => {
    setActivePanel(panel);
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  const handleActivityHourChange = useCallback((_hour: number) => {}, []);

  useEffect(() => {
    setFocusedStepIndex(null);
  }, [route]);

  useEffect(() => {
    if (!hasAutoShownRouteGuideThisRuntime) {
      hasAutoShownRouteGuideThisRuntime = true;
      setShowGuide(true);
    }
  }, []);

  const dismissGuide = useCallback(() => {
    setShowGuide(false);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_PANEL_MEDIA_QUERY);
    const syncViewport = (event?: MediaQueryListEvent) => {
      setIsMobileViewport(event ? event.matches : mediaQuery.matches);
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (hasAppliedSearchRef.current) return;

    const endFromSearch = parsePointFromSearch(location.search, "end");
    const startFromSearch = parsePointFromSearch(location.search, "start");
    const autoLocate = shouldAutoLocateStart(location.search);

    if (!endFromSearch && !startFromSearch && !autoLocate) return;

    hasAppliedSearchRef.current = true;
    setActivePanel(!isMobileViewport || Boolean(endFromSearch) ? "route" : null);
    setFocusedStepIndex(null);
    setRouteError(null);
    clearRouteOnly();

    const safeStartPoint = startFromSearch && isSupportedPoint(startFromSearch) ? startFromSearch : null;
    const safeEndPoint = endFromSearch && isSupportedPoint(endFromSearch) ? endFromSearch : null;
    const hadOutOfBoundsPoint = Boolean((startFromSearch && !safeStartPoint) || (endFromSearch && !safeEndPoint));

    if (safeEndPoint) {
      setEndPoint(safeEndPoint);
    } else if (endFromSearch) {
      setEndPoint(null);
    }

    if (hadOutOfBoundsPoint) {
      showOutsideRegionError();
    }

    if (safeStartPoint) {
      setStartPoint(safeStartPoint);
      if (safeEndPoint) {
        void requestRoute(profile, safeStartPoint, safeEndPoint);
      }
      return;
    }

    if (autoLocate) {
      setStartPoint(null);
      handleUseCurrentLocation(safeEndPoint);
      return;
    }

    if (startFromSearch) {
      setStartPoint(null);
      return;
    }
  }, [clearRouteOnly, handleUseCurrentLocation, isMobileViewport, isSupportedPoint, location.search, profile, requestRoute, showOutsideRegionError]);

  useEffect(() => {
    if (!areaLayers.easePlaces) {
      setSelectedEasePlace(null);
    }
  }, [areaLayers.easePlaces]);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!isMobileViewport || activePanel === null) return;
    setMobileSheetMode("expanded");
  }, [activePanel, isMobileViewport]);

  useEffect(() => {
    if (!isMobileViewport || activePanel === null) return;
    const updateHeight = () => {
      const nextHeight = sheetRef.current?.getBoundingClientRect().height ?? 0;
      setMobileSheetHeight(nextHeight);
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => {
      window.removeEventListener("resize", updateHeight);
    };
  }, [activePanel, isMobileViewport]);

  const mobileSheetPeekOffset = Math.max(0, mobileSheetHeight - 88);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#edf0f2]">
      <svg aria-hidden="true" className="pointer-events-none fixed h-0 w-0">
        <filter id="route-liquid-glass-filter" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.032" numOctaves="2" seed="12" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <AppTopNav
        variant="landing"
        landingMode="compact"
        landingTone="dark"
        landingTransitionProgress={1}
        landingOverlayOpen={landingMenuOpen}
        onLandingOverlayOpenChange={setLandingMenuOpen}
        hideCompactTrigger
        className="app-top-nav--route-page app-top-nav--route-overlay"
      />
      <AnimatePresence initial={false}>
        {landingMenuOpen ? (
          <motion.div
            className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[300] sm:right-4 sm:top-4"
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -10 }}
            transition={{ type: "spring", stiffness: 240, damping: 18, mass: 0.84 }}
          >
            <RoutePageMenuTrigger open onToggle={() => setLandingMenuOpen(false)} />
          </motion.div>
        ) : null}
      </AnimatePresence>
      <motion.div
        className="fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[300] flex justify-center px-2 sm:top-4 sm:px-4"
        animate={{
          opacity: landingMenuOpen ? 0 : 1,
          y: landingMenuOpen ? -18 : 0,
          scale: landingMenuOpen ? 0.98 : 1,
        }}
        transition={{ type: "spring", stiffness: 220, damping: 20, mass: 0.9 }}
        style={{ pointerEvents: landingMenuOpen ? "none" : "auto" }}
      >
        <div
          style={routeToolbarStyle}
          className="flex min-h-14 w-[min(92vw,112rem)] items-center gap-1 rounded-[28px] border border-white/55 px-2 py-2 text-[#17413f] shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]"
        >
          <div className="flex min-w-0 items-center gap-1">
            <TopBarActionButton
              label="Back"
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={handleBack}
              title="Back to previous page"
              ariaLabel="Back to previous page"
              compactOnMobile
            />
            <div className="route-page-toolbar-divider" aria-hidden="true" />
            <LayoutGroup id="route-page-bar-panels">
              <div className="flex items-center gap-1">
                <TopBarActionButton
                  label="Route"
                  icon={<Navigation className="h-4 w-4" />}
                  active={activePanel === "route"}
                  onClick={() => openPanel("route")}
                />
                <TopBarActionButton
                  label="Layers"
                  icon={<Layers3 className="h-4 w-4" />}
                  active={activePanel === "layers"}
                  onClick={() => openPanel("layers")}
                />
              </div>
            </LayoutGroup>
          </div>
          <div className="min-w-6 flex-1" />
          <div className="flex min-w-0 items-center justify-end gap-1">
            <TopBarActionButton
              label="Tips"
              active={showGuide}
              onClick={() => setShowGuide(true)}
              title="Open quick guide"
              ariaLabel="Open quick guide"
            />
            <RoutePageMenuTrigger open={landingMenuOpen} onToggle={() => setLandingMenuOpen((current) => !current)} />
            <div className="route-page-toolbar-divider" aria-hidden="true" />
            <TopBarActionButton
              label="Zoom out"
              icon={<Minus className="h-4 w-4" />}
              onClick={() => mapViewportControls?.zoomOut()}
              title="Zoom out"
              ariaLabel="Zoom out"
              iconOnly
              disabled={!mapViewportControls}
            />
            <TopBarActionButton
              label="Zoom in"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => mapViewportControls?.zoomIn()}
              title="Zoom in"
              ariaLabel="Zoom in"
              iconOnly
              disabled={!mapViewportControls}
            />
          </div>
        </div>
      </motion.div>
      <WhiteModelMap
        mapboxToken={MAPBOX_PUBLIC_TOKEN}
        startPoint={startPoint}
        endPoint={endPoint}
        route={route}
        focusedStep={focusedStepIndex !== null && route ? route.steps[focusedStepIndex] ?? null : null}
        showEasePlaces={areaLayers.easePlaces}
        showNaturalPlaces={areaLayers.naturalPlaces}
        showStreetFacilities={areaLayers.streetFacilities}
        showNavigationControl
        onMapClick={handleMapClick}
        onMapError={handleMapError}
        onViewportControlsReady={setMapViewportControls}
        onEasePlaceSelect={handleEasePlaceSelect}
      />
      <AnimatePresence>
        {showGuide ? (
        <motion.div
          data-testid="route-guide-overlay"
          style={liquidGlassPanelStyle}
          className="fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-30 max-h-[calc(100dvh-max(1.5rem,env(safe-area-inset-top)+env(safe-area-inset-bottom)))] w-[min(34rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-y-auto rounded-[30px] border border-white/60 px-5 py-5 text-[#17413f] shadow-[0_28px_70px_rgba(4,14,14,0.18)] sm:top-24 sm:max-h-[calc(100dvh-6rem)] sm:w-[min(34rem,calc(100vw-2rem))] sm:px-7 sm:py-7"
          initial={{ opacity: 0, scale: 0.82, y: 46 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 18 }}
          transition={{ type: "spring", stiffness: 210, damping: 18, mass: 0.9 }}
        >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f8682]">Quick guide</p>
                <h2 className="mt-1 text-[1.45rem] font-semibold leading-tight sm:text-[1.65rem]">3D Route Preview</h2>
              </div>
              <button
                type="button"
                onClick={dismissGuide}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/45 bg-white/40 text-[#456765] transition hover:bg-white/65 hover:text-[#17413f]"
                aria-label="Close 3D route guide"
                title="Close"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3.5 text-[0.96rem] leading-6 text-[#456765]">
              <div className={`rounded-2xl px-4 py-3.5 ${liquidGlassCardClass}`}>
                Tap or click the map once to choose your start point.
              </div>
              <div className={`rounded-2xl px-4 py-3.5 ${liquidGlassCardClass}`}>
                Pick the end point next and the route panel will expand with directions.
              </div>
              <div className={`rounded-2xl px-4 py-3.5 ${liquidGlassCardClass}`}>
                Use the <span className="font-semibold text-[#17413f]">pin button</span> or tap the <span className="font-semibold text-[#17413f]">Start card</span> to lock map point picking. While locked, map clicks will not replace your route points.
              </div>
              <div className={`rounded-2xl px-4 py-3.5 ${liquidGlassCardClass}`}>
                To choose new points again, delete <span className="font-semibold text-[#17413f]">Start</span> or <span className="font-semibold text-[#17413f]">End</span>, then turn point picking back on.
              </div>
              <div className={`rounded-2xl px-4 py-3.5 ${liquidGlassCardClass}`}>
                Switch between <span className="font-semibold text-[#17413f]">Route</span> and <span className="font-semibold text-[#17413f]">Layers</span> in the lower panel any time.
              </div>
              <div className={`rounded-2xl px-4 py-3.5 ${liquidGlassCardClass}`}>
                In <span className="font-semibold text-[#17413f]">Layers</span>, you can turn on <span className="font-semibold text-[#17413f]">Natural Places</span> for parks and water, <span className="font-semibold text-[#17413f]">Ease Places</span> for supportive destinations, and <span className="font-semibold text-[#17413f]">Public Facilities</span> for bike racks, fountains, and seating.
              </div>
              <div className={`rounded-2xl px-4 py-3.5 ${liquidGlassCardClass}`}>
                When a layer is active, the <span className="font-semibold text-[#17413f]">Layer legend</span> below updates so you can quickly understand what each colour and symbol means on the 3D map.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <p className="max-w-[15rem] text-xs leading-5 text-[#6b8582]">This guide appears once after each refresh. Use the button below to reopen it any time.</p>
              <button
                type="button"
                onClick={dismissGuide}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#83c5be]/55 bg-[#17413f] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(23,65,63,0.24)] transition hover:bg-[#0f3230] active:scale-[0.98]"
              >
                Got it
              </button>
            </div>
        </motion.div>
      ) : null}
      </AnimatePresence>
      {selectedEasePlace && areaLayers.easePlaces ? (
        <EasePlacesDetailPopup
          feature={selectedEasePlace.feature}
          anchorPoint={selectedEasePlace.point}
          viewport={selectedEasePlace.viewport}
          onClose={() => setSelectedEasePlace(null)}
        />
      ) : null}

      <AnimatePresence initial={false}>
      {!panelCollapsed ? (
      <motion.aside
        ref={(node) => {
          sheetRef.current = node;
        }}
        style={liquidGlassPanelStyle}
        className={`absolute left-4 top-20 z-10 flex max-w-[calc(100vw-2rem)] flex-col overflow-hidden border border-white/55 max-md:fixed max-md:bottom-0 max-md:left-3 max-md:right-3 max-md:top-auto max-md:max-w-none max-md:rounded-t-[26px] max-md:rounded-b-[18px] max-md:pb-[max(env(safe-area-inset-bottom),0px)] ${
          panelHasDenseContent
            ? "bottom-4 w-[386px] rounded-[24px] max-md:max-h-[58dvh] max-md:w-auto"
            : "w-[386px] rounded-[24px] max-md:max-h-[58dvh] max-md:w-auto"
        }`}
        initial={isMobileViewport ? { opacity: 0, scale: 0.96, y: 120 } : { opacity: 0, scale: 0.88, x: -26, y: 18 }}
        animate={
          isMobileViewport
            ? { opacity: 1, scale: 1, x: 0, y: mobileSheetMode === "peek" ? mobileSheetPeekOffset : 0 }
            : { opacity: 1, scale: 1, x: 0, y: 0 }
        }
        exit={isMobileViewport ? { opacity: 0, scale: 0.97, y: 140 } : { opacity: 0, scale: 0.94, x: -14, y: 10 }}
        drag={isMobileViewport ? "y" : false}
        dragConstraints={isMobileViewport ? { top: 0, bottom: mobileSheetPeekOffset } : undefined}
        dragElastic={0.08}
        onDragEnd={(_, info) => {
          if (!isMobileViewport) return;
          if (info.offset.y > 80 || info.velocity.y > 520) {
            setMobileSheetMode("peek");
            return;
          }
          if (info.offset.y < -80 || info.velocity.y < -520) {
            setMobileSheetMode("expanded");
            return;
          }
          setMobileSheetMode(info.offset.y > mobileSheetPeekOffset / 2 ? "peek" : "expanded");
        }}
        transition={{ type: "spring", stiffness: 210, damping: 20, mass: 0.92 }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.48),transparent_34%),linear-gradient(120deg,rgba(255,255,255,0.12),transparent_42%,rgba(255,255,255,0.1)_68%,transparent)]" />
          <>
        {isMobileViewport ? (
          <div className="flex justify-center px-4 pt-3">
            <button
              type="button"
              onClick={() => setMobileSheetMode((current) => (current === "expanded" ? "peek" : "expanded"))}
              className="route-page-sheet-handle"
              aria-label={mobileSheetMode === "expanded" ? "Collapse panel preview" : "Expand panel preview"}
            >
              <span className="route-page-sheet-handle-bar" />
            </button>
          </div>
        ) : null}
        <div className="relative border-b border-white/38 px-4 py-4 shadow-[inset_0_-1px_0_rgba(23,65,63,0.06)] sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5f8682]">MoveComfortly route</p>
              <h1 className="mt-1 text-xl font-semibold text-[#17413f]">3D Route Preview</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-start">
              <button
                type="button"
                onClick={() => setIsMapPointSelectionEnabled((current) => !current)}
                disabled={!canUseRouteApi}
                aria-label={isMapPointSelectionEnabled ? "Disable map point selection" : "Enable map point selection"}
                title={isMapPointSelectionEnabled ? "Disable point picking" : "Enable point picking"}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_18px_rgba(23,65,63,0.08)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${
                  isMapPointSelectionEnabled
                    ? "border-[#83c5be]/55 bg-[#17413f] text-white hover:bg-[#0f3230]"
                    : "border-white/42 bg-white/42 text-[#6b8582] hover:bg-white/62 hover:text-[#17413f]"
                }`}
              >
                <MapPinned className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={geolocation.status === "loading" || !canUseRouteApi}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/42 bg-white/42 text-[#17413f] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_18px_rgba(23,65,63,0.08)] transition hover:bg-white/62 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                title="Use current location as start"
              >
                {geolocation.status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LocateFixed className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={closePanel}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/42 bg-white/42 text-[#17413f] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_18px_rgba(23,65,63,0.08)] transition hover:bg-white/62 active:scale-[0.98]"
                title="Collapse panel"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className={`relative ${panelHasDenseContent ? "flex-1 overflow-y-auto" : ""} px-4 py-4 sm:px-5`}>
          {activePanel === "route" ? (
            <>
              <div className={`mb-4 rounded-2xl p-4 text-sm text-[#456765] ${liquidGlassInteractiveClass}`} tabIndex={0}>
                <div className="flex items-start gap-3">
                  <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-[#17413f]" />
                  <p>{currentInstruction}</p>
                </div>
              </div>

              <div className={`mb-4 rounded-2xl p-4 text-sm text-[#456765] ${liquidGlassInteractiveClass}`} tabIndex={0}>
                <div className="flex items-start gap-3">
                  <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-[#17413f]" />
                  <p>Drag to pan, scroll to zoom, and right-drag or use the compass control to rotate and tilt the 3D city view.</p>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 rounded-full border border-white/32 bg-white/28 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                <button
                  type="button"
                  onClick={() => handleProfileChange("walking")}
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition active:scale-[0.98] max-sm:min-h-11 ${
                    profile === "walking" ? "bg-white/72 text-[#17413f] shadow-[0_8px_18px_rgba(23,65,63,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]" : "text-[#5f8682] hover:text-[#17413f]"
                  }`}
                >
                  <Footprints className="h-4 w-4" />
                  Walking
                </button>
                <button
                  type="button"
                  onClick={() => handleProfileChange("cycling")}
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition active:scale-[0.98] max-sm:min-h-11 ${
                    profile === "cycling" ? "bg-white/72 text-[#17413f] shadow-[0_8px_18px_rgba(23,65,63,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]" : "text-[#5f8682] hover:text-[#17413f]"
                  }`}
                >
                  <Bike className="h-4 w-4" />
                  Cycling
                </button>
              </div>

              {geolocation.message ? (
                <div
                  className={`mb-4 rounded-2xl border p-3 text-sm ${
                    geolocation.status === "error"
                      ? "border-red-200 bg-red-50 text-red-800"
                      : geolocation.status === "warning"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {geolocation.message}
                </div>
              ) : null}

              {routeError ? (
                <div className="mb-4 rounded-2xl border border-red-200/70 bg-red-50/72 p-4 text-sm text-red-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.66)]">
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    {routeError.title}
                  </div>
                  <p>{routeError.message}</p>
                </div>
              ) : null}

              <div className="mb-4 space-y-3">
                <PointRow
                  label="Start"
                  point={startPoint}
                  badgeClassName="bg-[#0f766e]"
                  onDelete={handleDeleteStart}
                  onPrimaryAction={() => setIsMapPointSelectionEnabled((current) => !current)}
                  primaryActionAriaLabel={
                    isMapPointSelectionEnabled
                      ? "Disable map point selection from Start card"
                      : "Enable map point selection from Start card"
                  }
                  statusLabel={isMapPointSelectionEnabled ? "Map picking ON" : "Map picking LOCKED"}
                  helperText="Tap Start to lock or re-arm map picking"
                  emphasized
                />
                <PointRow label="End" point={endPoint} badgeClassName="bg-[#ea580c]" onDelete={handleDeleteEnd} />
              </div>

              {isRouteLoading ? (
                <div className="mb-4 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                  <div className={`h-[86px] animate-pulse rounded-2xl ${liquidGlassCardClass}`} />
                  <div className={`h-[86px] animate-pulse rounded-2xl ${liquidGlassCardClass}`} />
                </div>
              ) : null}

              {route ? (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                    <Metric label="Distance" value={formatDistance(route.distanceMeters)} />
                    <Metric label="Time" value={formatDuration(route.durationSeconds)} />
                  </div>

                  <div className="mb-3 flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-[#17413f]" />
                    <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5f8682]">Directions</h2>
                  </div>
                  {route.steps.length > 0 ? (
                    <div className="space-y-3">
                      {route.steps.map((step, index) => (
                        <button
                          key={`${step.instruction}-${index}`}
                          type="button"
                          onClick={() => setFocusedStepIndex(index)}
                          className={`w-full rounded-2xl p-4 text-left ${liquidGlassInteractiveClass} ${
                            focusedStepIndex === index
                              ? "border-[#83c5be]/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.52),rgba(186,226,220,0.2))] shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_20px_42px_rgba(4,14,14,0.14)]"
                              : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 max-sm:flex-col">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f8682]">
                                {step.modifier ?? step.type}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#17413f]">{step.instruction}</p>
                              {step.roadName ? <p className="mt-1 text-xs text-[#6b8582]">{step.roadName}</p> : null}
                            </div>
                            <span className="shrink-0 rounded-full bg-[#e3f3ef] px-2 py-1 text-xs font-semibold text-[#456765] max-sm:self-start">
                              {formatDistance(step.distanceMeters)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/38 bg-white/34 p-4 text-sm text-[#456765] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                      The route was returned without step-by-step instructions.
                    </div>
                  )}
                </>
              ) : null}
            </>
          ) : null}

          {activePanel === "layers" ? (
            <>
              <div className={`mb-4 rounded-2xl p-4 text-sm text-[#456765] ${liquidGlassInteractiveClass}`} tabIndex={0}>
                <div className="flex items-start gap-3">
                  <Layers3 className="mt-0.5 h-4 w-4 shrink-0 text-[#17413f]" />
                  <div>
                    <p className="font-semibold text-[#17413f]">Area layers</p>
                    <p className="mt-1 text-xs text-[#6b8582]">
                      {activeLayerCount === 0 ? "No place-based layers active." : `${activeLayerCount} layer${activeLayerCount > 1 ? "s" : ""} active.`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <LayerToggle
                  label="Natural Places"
                  description="Parks and waterbodies for green-blue context."
                  checked={areaLayers.naturalPlaces}
                  onToggle={() => handleLayerToggle("naturalPlaces")}
                />
                <LayerToggle
                  label="Ease Places"
                  description="Supportive destinations such as museums, parks, and shopping."
                  checked={areaLayers.easePlaces}
                  onToggle={() => handleLayerToggle("easePlaces")}
                />
                <LayerToggle
                  label="Public Facilities"
                  description="Bicycle racks, drinking fountains, and public seating from the map page."
                  checked={areaLayers.streetFacilities}
                  onToggle={() => handleLayerToggle("streetFacilities")}
                />
              </div>

              <ActiveLayerLegends
                filters={{
                  easePlaces: areaLayers.easePlaces,
                  naturalPlaces: areaLayers.naturalPlaces,
                  streetFacilities: areaLayers.streetFacilities,
                }}
              />

              {areaLayers.activityDensity ? (
                <div className={`mt-4 rounded-2xl p-4 ${liquidGlassCardClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f8682]">Time of day</p>
                      <p className="mt-1 text-sm font-semibold text-[#17413f]">
                        {activityDensity.date && activityDensity.selectedHour !== null
                          ? `${activityDensity.date} 路 ${formatHourLabel(activityDensity.selectedHour)}`
                          : activityDensity.loading
                            ? "Loading latest available day..."
                            : activityDensity.loaded
                              ? "Latest day has no mappable activity data"
                              : "Turn on Activity Density to load the latest day"}
                      </p>
                    </div>
                  </div>

                  {activityDensity.loading ? (
                    <div className="mt-3 rounded-2xl border border-white/38 bg-white/34 p-3 text-sm text-[#456765] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                      {activityStatusLabel}
                    </div>
                  ) : null}

                  {activityDensity.error ? (
                    <div className="mt-3 rounded-2xl border border-red-200/70 bg-red-50/72 p-3 text-sm text-red-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.66)]">
                      {activityDensity.error}
                    </div>
                  ) : null}

                  {!activityDensity.loading && !activityDensity.error && activityDensity.availableHours.length > 0 ? (
                    <>
                      <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-[#5f8682]">
                        Available hour
                      </label>
                      <select
                        value={activityDensity.selectedHour ?? ""}
                        onChange={(event) => handleActivityHourChange(Number(event.target.value))}
                        className="mt-2 w-full rounded-2xl border border-white/42 bg-white/42 px-3 py-2 text-sm font-medium text-[#17413f] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]/55"
                      >
                        {activityDensity.availableHours.map((hour) => (
                          <option key={hour} value={hour}>
                            {formatHourLabel(hour)}
                          </option>
                        ))}
                      </select>
                      <p className="mt-3 text-xs text-[#6b8582]">
                        {visibleActivityFeatures.length > 0
                          ? `${visibleActivityFeatures.length} pedestrian counter points visible for this hour.`
                          : "No pedestrian counter points are available for this hour."}
                      </p>
                    </>
                  ) : null}

                  {!activityDensity.loading && !activityDensity.error && activityDensity.availableHours.length === 0 ? (
                    <div className="mt-3 rounded-2xl border border-white/38 bg-white/34 p-3 text-sm text-[#456765] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                      The latest available day has no mappable activity density data yet.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
          </>
      </motion.aside>
      ) : null}
      </AnimatePresence>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={`rounded-2xl p-4 ${liquidGlassInteractiveClass}`} tabIndex={0}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f8682]">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[#17413f]">{value}</p>
    </div>
  );
}

function PointRow({
  label,
  point,
  badgeClassName,
  onDelete,
  onPrimaryAction,
  primaryActionAriaLabel,
  statusLabel,
  helperText,
  emphasized = false,
}: {
  label: string;
  point: RoutePoint | null;
  badgeClassName: string;
  onDelete: () => void;
  onPrimaryAction?: () => void;
  primaryActionAriaLabel?: string;
  statusLabel?: string;
  helperText?: string;
  emphasized?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl p-3 ${liquidGlassInteractiveClass} ${emphasized ? "border-[#83c5be]/55 bg-[linear-gradient(145deg,rgba(255,255,255,0.58),rgba(186,226,220,0.18))] shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_18px_38px_rgba(4,14,14,0.1)]" : ""}`} tabIndex={0}>
      <span
        data-testid={`point-badge-${label.toLowerCase()}`}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[4px] border-white text-[0.82rem] font-black leading-none text-white shadow-[0_0_0_6px_rgba(255,255,255,0.26),0_0_0_12px_rgba(255,255,255,0.1),0_14px_28px_rgba(15,23,42,0.22)] ${badgeClassName}`}
      >
        {label[0]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[#17413f]">{label}</p>
          {statusLabel ? (
            <span className="rounded-full border border-[#83c5be]/45 bg-[#e3f3ef] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#17413f]">
              {statusLabel}
            </span>
          ) : null}
        </div>
        <p className="truncate text-xs text-[#6b8582]">{point ? formatPoint(point) : "Not selected"}</p>
        {helperText ? <p className="mt-1 text-xs font-semibold text-[#0f766e]">{helperText}</p> : null}
      </div>
      {onPrimaryAction ? (
        <button
          type="button"
          onClick={onPrimaryAction}
          aria-label={primaryActionAriaLabel ?? `${label} primary action`}
          aria-pressed={statusLabel?.includes("LOCKED") ? true : false}
          className="relative inline-flex h-10 w-20 shrink-0 cursor-pointer items-center"
        >
          <span
            className={`absolute inset-0 rounded-full border border-white/55 shadow-[0_10px_22px_rgba(23,65,63,0.14),inset_0_1px_0_rgba(255,255,255,0.55)] outline-none ring-0 transition-all duration-300 ${
              statusLabel?.includes("LOCKED")
                ? "bg-[linear-gradient(135deg,#83c5be,#5fa8a1)]"
                : "bg-[linear-gradient(135deg,#d7e9e5,#b8d7d1)]"
            }`}
          />
          <svg
            className={`absolute top-1 h-8 w-8 stroke-[#17413f] transition-all duration-300 ${
              statusLabel?.includes("LOCKED") ? "left-10" : "left-1.5"
            }`}
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M50,18A19.9,19.9,0,0,0,30,38v8a8,8,0,0,0-8,8V74a8,8,0,0,0,8,8H70a8,8,0,0,0,8-8V54a8,8,0,0,0-8-8H38V38a12,12,0,0,1,23.6-3,4,4,0,1,0,7.8-2A20.1,20.1,0,0,0,50,18Z"
              className="fill-[#17413f]"
            />
          </svg>
          <svg
            className={`absolute top-1 h-8 w-8 stroke-[#456765] transition-all duration-300 ${
              statusLabel?.includes("LOCKED") ? "left-1.5" : "left-10"
            }`}
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M30,46V38a20,20,0,0,1,40,0v8a8,8,0,0,1,8,8V74a8,8,0,0,1-8,8H30a8,8,0,0,1-8-8V54A8,8,0,0,1,30,46Zm32-8v8H38V38a12,12,0,0,1,24,0Z"
              className="fill-[#456765]"
            />
          </svg>
          <span
            className={`absolute top-1 flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(145deg,#f8fbfa,#ffffff)] shadow-[0_8px_18px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.88)] outline-none transition-all duration-300 ${
              statusLabel?.includes("LOCKED")
                ? "left-1"
                : "left-1 translate-x-10"
            }`}
          />
        </button>
      ) : null}
      {point ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${label} point`}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#6b8582] transition hover:bg-white/48 hover:text-red-600 active:scale-[0.98]"
          title={`Delete ${label.toLowerCase()} point`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : (
        <XCircle className="h-4 w-4 shrink-0 text-slate-300" />
      )}
    </div>
  );
}

function LayerToggle({
  label,
  description,
  checked,
  onToggle,
  disabled = false,
  badge,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`flex min-h-[106px] w-full items-center justify-between gap-3 rounded-2xl p-3 text-left ${liquidGlassInteractiveClass} ${disabled ? "cursor-not-allowed opacity-65" : ""} max-sm:items-start`}
      aria-pressed={checked}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[#17413f]">{label}</p>
          {badge ? (
            <span className="rounded-full border border-white/45 bg-white/42 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f8682]">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-[#6b8582]">{description}</p>
      </div>
      <span className={`relative inline-flex shrink-0 text-[1rem] [perspective:400px] ${disabled ? "opacity-70" : ""}`}>
        <span
          className={`relative inline-block h-7 w-[3.85rem] overflow-hidden rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_10px_22px_rgba(4,14,14,0.12)] transition-all duration-300 ease-in-out ${
            checked
              ? "border-[#58ada4] bg-[linear-gradient(90deg,#66d2c5,#4da79e)]"
              : "border-white/60 bg-[linear-gradient(180deg,rgba(229,233,233,0.96),rgba(203,209,209,0.92))]"
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute z-20 h-[0.34rem] w-[0.62rem] transition-all duration-500 ease-in-out ${
              checked ? "left-[2.42rem] top-[0.48rem] rotate-y-180" : "left-[0.34rem] top-[0.48rem]"
            }`}
          >
            <span className={`absolute left-0 top-0 h-[0.12rem] w-[0.12rem] rounded-full ${checked ? "bg-[#0f5f5a]" : "bg-[#8b9494]"}`} />
            <span className={`absolute right-0 top-0 h-[0.12rem] w-[0.12rem] rounded-full ${checked ? "bg-[#0f5f5a]" : "bg-[#8b9494]"}`} />
            <span className={`absolute left-[0.08rem] top-[0.16rem] h-[0.16rem] w-[0.46rem] rounded-b-full border-b-[1.5px] border-x-[1.5px] border-transparent ${checked ? "border-b-[#0f5f5a]" : "border-b-[#7f8888]"}`} />
          </span>
        </span>
        <span
          className={`absolute z-10 top-[0.18rem] h-[1.18rem] w-[1.18rem] rounded-full bg-[linear-gradient(145deg,#eef4f4,#ffffff)] shadow-[0_7px_14px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-300 ease-in-out ${
            checked ? "left-[2.45rem]" : "left-[0.18rem]"
          }`}
        />
      </span>
    </button>
  );
}

function ActiveLayerLegends({ filters }: { filters: LayerLegendFilters }) {
  const sections = [
    filters.easePlaces ? "easePlaces" : null,
    filters.naturalPlaces ? "naturalPlaces" : null,
    filters.streetFacilities ? "streetFacilities" : null,
  ].filter(Boolean);

  if (sections.length === 0) return null;

  const showDividerBefore = (section: string) => sections[0] !== section;

  return (
    <div
      data-testid="active-layer-legends"
      className={`mt-4 max-h-[min(38vh,18rem)] overflow-y-auto rounded-2xl p-4 pr-3 ${liquidGlassCardClass}`}
    >
      <div className="flex items-start gap-3">
        <Layers3 className="mt-0.5 h-4 w-4 shrink-0 text-[#17413f]" />
        <div className="min-w-0">
          <p className="font-semibold text-[#17413f]">Layer legend</p>
          <p className="mt-1 text-xs text-[#6b8582]">Only active layers are shown here.</p>
        </div>
      </div>

      <div className="mt-4 space-y-4 text-sm text-[#456765]">
        {filters.easePlaces ? (
          <div className={showDividerBefore("easePlaces") ? "border-t border-white/35 pt-4" : ""}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f8682]">Ease Places</p>
            <div className="mt-3 space-y-2">
              <LegendRow swatchClassName="bg-[#6a5ca5] shadow-[0_0_0_5px_rgba(106,92,165,0.22)]" label="Arts, Culture & Enrichment" />
              <LegendRow swatchClassName="bg-[#1f9d68] shadow-[0_0_0_5px_rgba(31,157,104,0.22)]" label="Recreation / Leisure & Open Spaces" />
              <LegendRow swatchClassName="bg-[#d975a4] shadow-[0_0_0_5px_rgba(217,117,164,0.22)]" label="Shopping" />
              <LegendRow swatchClassName="bg-[#dd6b20] shadow-[0_0_0_5px_rgba(221,107,32,0.22)]" label="Food & Dining" />
            </div>
          </div>
        ) : null}

        {filters.naturalPlaces ? (
          <div className={showDividerBefore("naturalPlaces") ? "border-t border-white/35 pt-4" : ""}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f8682]">Natural Places</p>
            <div className="mt-3 space-y-2">
              <LegendRow swatchClassName="border-2 border-[#2a7486] bg-[#9ed7df]" label="Waterbody" square />
              <LegendRow swatchClassName="border-2 border-[#4b7b46] bg-[#b8d9a6]" label="Park" square />
            </div>
          </div>
        ) : null}

        {filters.streetFacilities ? (
          <div className={showDividerBefore("streetFacilities") ? "border-t border-white/35 pt-4" : ""}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f8682]">Public Facilities</p>
            <div className="mt-3 space-y-2">
              <LegendRow swatchClassName="bg-[#0891b2]" label="Drinking Fountain" />
              <LegendRow swatchClassName="bg-[#c2410c]" label="Bicycle Rack" />
              <LegendRow swatchClassName="bg-[#7e22ce]" label="Seat" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LegendRow({
  swatchClassName,
  label,
  square = false,
}: {
  swatchClassName: string;
  label: string;
  square?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`block h-3 w-3 shrink-0 ${square ? "rounded-[3px]" : "rounded-full"} ${swatchClassName}`}
      />
      <span>{label}</span>
    </div>
  );
}

function TopBarActionButton({
  active = false,
  icon,
  label,
  onClick,
  title,
  ariaLabel,
  disabled = false,
  iconOnly = false,
  compactOnMobile = false,
}: {
  active?: boolean;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
  title?: string;
  ariaLabel?: string;
  disabled?: boolean;
  iconOnly?: boolean;
  compactOnMobile?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      className={`route-page-toolbar-button ${iconOnly ? "route-page-toolbar-button--icon" : "route-page-toolbar-button--text"} ${
        compactOnMobile ? "route-page-toolbar-button--compact-mobile" : ""
      }`}
      animate={{
        scale: active ? 1.03 : 1,
      }}
      whileHover={disabled ? undefined : { scale: active ? 1.035 : 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, mass: 0.82 }}
    >
      {active ? <motion.span layoutId="route-page-toolbar-active-pill" className="route-page-toolbar-active-pill" /> : null}
      {icon ? <span className="relative z-[1]">{icon}</span> : null}
      {!iconOnly ? (
        <span className={`relative z-[1] ${compactOnMobile ? "max-sm:hidden" : ""}`}>{label}</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </motion.button>
  );
}

function RoutePageMenuTrigger({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <motion.div
      className="app-top-nav app-top-nav--route-page app-top-nav--tone-dark"
      animate={{ scale: open ? 1.04 : 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 18, mass: 0.82 }}
    >
      <button
        type="button"
        className={`app-top-nav__compact-trigger${open ? " is-open" : ""}`}
        aria-label={open ? "Close landing navigation menu" : "Open landing navigation menu"}
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="app-top-nav__compact-copy">
          <span className="app-top-nav__compact-label app-top-nav__compact-label--menu">Menu</span>
          <span className="app-top-nav__compact-label app-top-nav__compact-label--close">Close</span>
        </span>
        <span className="app-top-nav__compact-icon-slot" aria-hidden="true">
          <span className="app-top-nav__compact-icon app-top-nav__compact-bars">
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span className="app-top-nav__compact-icon app-top-nav__compact-close">
            <span className="app-top-nav__compact-close-stroke app-top-nav__compact-close-stroke--a"></span>
            <span className="app-top-nav__compact-close-stroke app-top-nav__compact-close-stroke--b"></span>
          </span>
        </span>
      </button>
    </motion.div>
  );
}
