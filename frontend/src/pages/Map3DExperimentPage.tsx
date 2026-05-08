import {
  AlertTriangle,
  ArrowLeft,
  Bike,
  Footprints,
  Loader2,
  LocateFixed,
  MapPinned,
  Navigation,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import WhiteModelMap, {
  type RoutePoint,
  type RouteProfile,
  type RouteStepItem,
  type RouteSummary,
} from "../components/WhiteModelMap";
import { APP_ROUTES } from "../lib/navigation";

const MAPBOX_PUBLIC_TOKEN = (import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined)?.trim() || null;
const ROUTE_REQUEST_TIMEOUT_MS = 12000;
const LOW_ACCURACY_THRESHOLD_METERS = 120;

type RouteError = {
  title: string;
  message: string;
};

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
      setProfile(nextProfile);
      if (startPoint && endPoint) {
        void requestRoute(nextProfile, startPoint, endPoint);
      }
    },
    [endPoint, requestRoute, startPoint]
  );

  const handleDeleteStart = useCallback(() => {
    clearRouteOnly();
    setStartPoint(null);
    setEndPoint(null);
    setRouteError(null);
  }, [clearRouteOnly]);

  const handleDeleteEnd = useCallback(() => {
    clearRouteOnly();
    setEndPoint(null);
    setRouteError(null);
  }, [clearRouteOnly]);

  const handleUseCurrentLocation = useCallback(() => {
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

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
    };
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#edf0f2]">
      <WhiteModelMap
        mapboxToken={MAPBOX_PUBLIC_TOKEN}
        startPoint={startPoint}
        endPoint={endPoint}
        route={route}
        onMapClick={handleMapClick}
        onMapError={handleMapError}
      />

      <aside className="absolute bottom-4 left-4 top-4 z-10 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-md max-md:right-4 max-md:top-auto max-md:max-h-[58dvh] max-md:w-auto">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Default route</p>
              <h1 className="mt-1 text-xl font-semibold text-slate-950">3D Route Preview</h1>
            </div>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={geolocation.status === "loading" || !canUseRouteApi}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
              title="Use current location as start"
            >
              {geolocation.status === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => handleProfileChange("walking")}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition active:scale-[0.98] ${
                profile === "walking" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Footprints className="h-4 w-4" />
              Walking
            </button>
            <button
              type="button"
              onClick={() => handleProfileChange("cycling")}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition active:scale-[0.98] ${
                profile === "cycling" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Bike className="h-4 w-4" />
              Cycling
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <div className="flex items-start gap-3">
              <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-slate-900" />
              <p>{currentInstruction}</p>
            </div>
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
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                {routeError.title}
              </div>
              <p>{routeError.message}</p>
            </div>
          ) : null}

          <div className="mb-4 space-y-3">
            <PointRow label="Start" point={startPoint} colorClass="bg-slate-950" onDelete={handleDeleteStart} />
            <PointRow label="End" point={endPoint} colorClass="bg-blue-600" onDelete={handleDeleteEnd} />
          </div>

          {isRouteLoading ? (
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="h-[86px] animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-[86px] animate-pulse rounded-2xl bg-slate-100" />
            </div>
          ) : null}

          {route ? (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <Metric label="Distance" value={formatDistance(route.distanceMeters)} />
                <Metric label="Time" value={formatDuration(route.durationSeconds)} />
              </div>

              <div className="mb-3 flex items-center gap-2">
                <Navigation className="h-4 w-4 text-slate-950" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Directions</h2>
              </div>
              {route.steps.length > 0 ? (
                <div className="space-y-3">
                  {route.steps.map((step, index) => (
                    <div key={`${step.instruction}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {step.modifier ?? step.type}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{step.instruction}</p>
                          {step.roadName ? <p className="mt-1 text-xs text-slate-500">{step.roadName}</p> : null}
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                          {formatDistance(step.distanceMeters)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  The route was returned without step-by-step instructions.
                </div>
              )}
            </>
          ) : null}
        </div>
      </aside>

      <button
        type="button"
        onClick={() => navigate(APP_ROUTES.compare)}
        className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_14px_34px_rgba(16,24,40,0.16)] backdrop-blur-md transition active:scale-[0.98]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
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
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass} text-xs font-bold text-white`}>
        {label[0]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="truncate text-xs text-slate-500">{point ? formatPoint(point) : "Not selected"}</p>
      </div>
      {point ? (
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-red-600 active:scale-[0.98]"
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
