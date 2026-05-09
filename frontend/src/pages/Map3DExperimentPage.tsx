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
  Navigation,
  Trash2,
  XCircle,
} from "lucide-react";
import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import WhiteModelMap, {
  type RoutePoint,
  type RouteProfile,
  type RouteStepItem,
  type RouteSummary,
} from "../components/WhiteModelMap";
import { fetchLatestActivityDensity, type ActivityDensityFeature } from "../lib/api";
import { APP_ROUTES } from "../lib/navigation";

const MAPBOX_PUBLIC_TOKEN = (import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined)?.trim() || null;
const ROUTE_REQUEST_TIMEOUT_MS = 12000;
const LOW_ACCURACY_THRESHOLD_METERS = 120;
const liquidGlassPanelStyle: CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(247,255,253,0.46), rgba(237,246,249,0.26) 54%, rgba(255,248,232,0.22))",
  backdropFilter: "url(#route-liquid-glass-filter) blur(16px) saturate(1.42) brightness(1.06)",
  WebkitBackdropFilter: "blur(16px) saturate(1.42) brightness(1.06)",
  boxShadow:
    "0 24px 60px rgba(4,14,14,0.14), inset 0 1px 0 rgba(255,255,255,0.58), inset 0 -18px 42px rgba(23,65,63,0.06)",
};

const liquidGlassCardClass =
  "border border-white/42 bg-[linear-gradient(145deg,rgba(255,255,255,0.34),rgba(237,246,249,0.18))] shadow-[inset_0_1px_0_rgba(255,255,255,0.58),0_12px_30px_rgba(4,14,14,0.055)]";

const liquidGlassInteractiveClass =
  `${liquidGlassCardClass} transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-white/72 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.48),rgba(237,246,249,0.24))] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_18px_42px_rgba(4,14,14,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#83c5be]/70`;

type RouteError = {
  title: string;
  message: string;
};

type AreaLayerState = {
  easePlaces: boolean;
  naturalPlaces: boolean;
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

type ActivityDensityState = {
  date: string | null;
  availableHours: number[];
  selectedHour: number | null;
  features: ActivityDensityFeature[];
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

export default function Map3DExperimentPage() {
  const navigate = useNavigate();
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
  const [activePanel, setActivePanel] = useState<PanelView>("route");
  const [focusedStepIndex, setFocusedStepIndex] = useState<number | null>(null);
  const [areaLayers, setAreaLayers] = useState<AreaLayerState>({
    easePlaces: false,
    naturalPlaces: false,
    activityDensity: false,
  });
  const [activityDensity, setActivityDensity] = useState<ActivityDensityState>({
    date: null,
    availableHours: [],
    selectedHour: null,
    features: [],
    loading: false,
    loaded: false,
    error: null,
  });
  const [geolocation, setGeolocation] = useState<GeolocationState>({
    status: "idle",
    message: null,
  });
  const requestIdRef = useRef(0);

  const routeReady = Boolean(route && startPoint && endPoint);
  const canUseRouteApi = Boolean(MAPBOX_PUBLIC_TOKEN);

  const clearRouteOnly = useCallback(() => {
    requestIdRef.current += 1;
    setRoute(null);
    setIsRouteLoading(false);
  }, []);

  const requestRoute = useCallback(
    async (nextProfile: RouteProfile, nextStart: RoutePoint, nextEnd: RoutePoint) => {
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
    []
  );

  const handleMapClick = useCallback(
    (point: RoutePoint) => {
      setActivePanel("route");
      setFocusedStepIndex(null);
      setGeolocation((current) => (current.status === "loading" ? current : { status: "idle", message: null }));
      setRouteError(null);

      if (!startPoint || (startPoint && endPoint)) {
        requestIdRef.current += 1;
        setStartPoint(point);
        setEndPoint(null);
        setRoute(null);
        setIsRouteLoading(false);
        return;
      }

      setEndPoint(point);
      void requestRoute(profile, startPoint, point);
    },
    [endPoint, profile, requestRoute, startPoint]
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

  const handleUseCurrentLocation = useCallback(() => {
    setActivePanel("route");
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
        clearRouteOnly();
        setStartPoint(point);
        setEndPoint(null);
        setRouteError(null);

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
  }, [clearRouteOnly]);

  const handleMapError = useCallback((message: string) => {
    setRouteError({
      title: "3D map problem",
      message,
    });
  }, []);

  const currentInstruction = useMemo(() => {
    if (!canUseRouteApi) return "Configure the Mapbox public token before using the 3D route preview.";
    if (!startPoint) return "Click the map once to set a start point.";
    if (!endPoint) return "Click the map again to set the destination.";
    if (isRouteLoading) return `Loading the default ${profile} route...`;
    if (routeReady) return "Route preview is ready.";
    return "Reselect points or switch travel mode to try again.";
  }, [canUseRouteApi, endPoint, isRouteLoading, profile, routeReady, startPoint]);

  const panelHasDenseContent = Boolean(route || routeError || isRouteLoading);
  const activeLayerCount =
    Number(areaLayers.easePlaces) + Number(areaLayers.naturalPlaces) + Number(areaLayers.activityDensity);
  const panelCollapsed = activePanel === null;
  const visibleActivityFeatures = useMemo(
    () =>
      activityDensity.selectedHour === null
        ? []
        : activityDensity.features.filter((feature) => feature.hourday === activityDensity.selectedHour),
    [activityDensity.features, activityDensity.selectedHour]
  );
  const activityStatusLabel = useMemo(() => {
    if (activityDensity.loading) return "Loading latest available day...";
    if (activityDensity.date && activityDensity.selectedHour !== null) {
      return `${activityDensity.date} at ${formatHourLabel(activityDensity.selectedHour)}`;
    }
    if (activityDensity.loaded) return "Latest day has no mappable activity data";
    return "Turn on Activity Density to load the latest day";
  }, [activityDensity.date, activityDensity.loaded, activityDensity.loading, activityDensity.selectedHour]);

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

  const handleActivityHourChange = useCallback((hour: number) => {
    setActivityDensity((current) => ({
      ...current,
      selectedHour: hour,
      error: null,
    }));
  }, []);

  useEffect(() => {
    setFocusedStepIndex(null);
  }, [route]);

  useEffect(() => {
    if (!areaLayers.activityDensity || activityDensity.loaded || activityDensity.loading) return;

    let cancelled = false;
    setActivityDensity((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    void fetchLatestActivityDensity()
      .then((data) => {
        if (cancelled) return;
        setActivityDensity({
          date: data.date,
          availableHours: data.availableHours,
          selectedHour: data.defaultHour,
          features: data.features,
          loading: false,
          loaded: true,
          error: null,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setActivityDensity((current) => ({
          ...current,
          loading: false,
          loaded: true,
          error: error instanceof Error ? error.message : "Activity density could not be loaded.",
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [activityDensity.loaded, activityDensity.loading, areaLayers.activityDensity]);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
    };
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#edf0f2]">
      <svg aria-hidden="true" className="pointer-events-none fixed h-0 w-0">
        <filter id="route-liquid-glass-filter" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.032" numOctaves="2" seed="12" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <WhiteModelMap
        mapboxToken={MAPBOX_PUBLIC_TOKEN}
        startPoint={startPoint}
        endPoint={endPoint}
        route={route}
        focusedStep={focusedStepIndex !== null && route ? route.steps[focusedStepIndex] ?? null : null}
        showEasePlaces={areaLayers.easePlaces}
        showNaturalPlaces={areaLayers.naturalPlaces}
        showActivityDensity={areaLayers.activityDensity}
        activityHour={activityDensity.selectedHour}
        activityFeatures={activityDensity.features}
        onMapClick={handleMapClick}
        onMapError={handleMapError}
      />

      <aside
        style={liquidGlassPanelStyle}
        className={`absolute left-4 top-4 z-10 flex max-w-[calc(100vw-2rem)] flex-col overflow-hidden border border-white/55 max-md:right-4 max-md:top-auto ${
          panelCollapsed
            ? "w-[184px] rounded-[18px]"
            : panelHasDenseContent
              ? "bottom-4 w-[386px] rounded-[24px] max-md:max-h-[62dvh] max-md:w-auto"
              : "w-[386px] rounded-[24px] max-md:w-auto"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.48),transparent_34%),linear-gradient(120deg,rgba(255,255,255,0.12),transparent_42%,rgba(255,255,255,0.1)_68%,transparent)]" />
        {panelCollapsed ? (
          <div className="grid grid-cols-2 gap-2 p-2">
            <CollapsedPanelButton
              label="Route"
              icon={<Navigation className="h-4 w-4" />}
              onClick={() => openPanel("route")}
            />
            <CollapsedPanelButton
              label="Layers"
              icon={<Layers3 className="h-4 w-4" />}
              onClick={() => openPanel("layers")}
            />
          </div>
        ) : (
          <>
        <div className="relative border-b border-white/38 px-5 py-4 shadow-[inset_0_-1px_0_rgba(23,65,63,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5f8682]">MoveComfortly route</p>
              <h1 className="mt-1 text-xl font-semibold text-[#17413f]">3D Route Preview</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/42 bg-white/42 px-3 text-sm font-semibold text-[#17413f] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_18px_rgba(23,65,63,0.08)] transition hover:bg-white/62 active:scale-[0.98]"
                title="Back to previous page"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
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

          <div className="mt-4 grid grid-cols-2 rounded-full border border-white/32 bg-white/28 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
            <PanelTabButton
              active={activePanel === "route"}
              icon={<Navigation className="h-4 w-4" />}
              label="Route"
              onClick={() => openPanel("route")}
            />
            <PanelTabButton
              active={activePanel === "layers"}
              icon={<Layers3 className="h-4 w-4" />}
              label="Layers"
              onClick={() => openPanel("layers")}
            />
          </div>
        </div>

        <div className={`relative ${panelHasDenseContent ? "flex-1 overflow-y-auto" : ""} px-5 py-4`}>
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
                  <p>Drag to pan, scroll to zoom, and right-drag or use the pitch control to rotate the city view.</p>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 rounded-full border border-white/32 bg-white/28 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                <button
                  type="button"
                  onClick={() => handleProfileChange("walking")}
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition active:scale-[0.98] ${
                    profile === "walking" ? "bg-white/72 text-[#17413f] shadow-[0_8px_18px_rgba(23,65,63,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]" : "text-[#5f8682] hover:text-[#17413f]"
                  }`}
                >
                  <Footprints className="h-4 w-4" />
                  Walking
                </button>
                <button
                  type="button"
                  onClick={() => handleProfileChange("cycling")}
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition active:scale-[0.98] ${
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
                <PointRow label="Start" point={startPoint} colorClass="bg-[#17413f]" onDelete={handleDeleteStart} />
                <PointRow label="End" point={endPoint} colorClass="bg-blue-600" onDelete={handleDeleteEnd} />
              </div>

              {isRouteLoading ? (
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className={`h-[86px] animate-pulse rounded-2xl ${liquidGlassCardClass}`} />
                  <div className={`h-[86px] animate-pulse rounded-2xl ${liquidGlassCardClass}`} />
                </div>
              ) : null}

              {route ? (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-3">
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
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f8682]">
                                {step.modifier ?? step.type}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#17413f]">{step.instruction}</p>
                              {step.roadName ? <p className="mt-1 text-xs text-[#6b8582]">{step.roadName}</p> : null}
                            </div>
                            <span className="shrink-0 rounded-full bg-[#e3f3ef] px-2 py-1 text-xs font-semibold text-[#456765]">
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

              <div className="space-y-3">
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
                  label="Activity Density"
                  description="Hourly crowd-density heatmap based on pedestrian counting points."
                  checked={areaLayers.activityDensity}
                  onToggle={() => handleLayerToggle("activityDensity")}
                />
              </div>

              {areaLayers.activityDensity ? (
                <div className={`mt-4 rounded-2xl p-4 ${liquidGlassCardClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f8682]">Time of day</p>
                      <p className="mt-1 text-sm font-semibold text-[#17413f]">
                        {activityDensity.date && activityDensity.selectedHour !== null
                          ? `${activityDensity.date} · ${formatHourLabel(activityDensity.selectedHour)}`
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
        )}
      </aside>
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
  colorClass,
  onDelete,
}: {
  label: string;
  point: RoutePoint | null;
  colorClass: string;
  onDelete: () => void;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl p-3 ${liquidGlassInteractiveClass}`} tabIndex={0}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass} text-xs font-bold text-white`}>
        {label[0]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#17413f]">{label}</p>
        <p className="truncate text-xs text-[#6b8582]">{point ? formatPoint(point) : "Not selected"}</p>
      </div>
      {point ? (
        <button
          type="button"
          onClick={onDelete}
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
      className={`flex items-center justify-between gap-3 rounded-2xl p-3 text-left ${liquidGlassInteractiveClass} ${disabled ? "cursor-not-allowed opacity-65" : ""}`}
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
      <span
        className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border transition ${
          checked
            ? "border-[#3f8f87] bg-[#83c5be]/80"
            : "border-white/45 bg-white/35"
        }`}
      >
        <span
          className={`absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white shadow-[0_6px_14px_rgba(15,23,42,0.18)] transition ${
            checked ? "left-[1.35rem]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function PanelTabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition active:scale-[0.98] ${
        active ? "bg-white/72 text-[#17413f] shadow-[0_8px_18px_rgba(23,65,63,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]" : "text-[#5f8682] hover:text-[#17413f]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function CollapsedPanelButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] border border-white/40 bg-white/28 px-3 text-sm font-semibold text-[#17413f] transition hover:bg-white/38 active:scale-[0.98]"
    >
      {icon}
      {label}
    </button>
  );
}
