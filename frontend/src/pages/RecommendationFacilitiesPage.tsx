import { useEffect, useState } from "react";
import {
  Armchair,
  ArrowLeft,
  Bike,
  Droplets,
  MapPinned,
  Navigation,
  TriangleAlert,
} from "lucide-react";
import type { AreaInfo, AreaRecommendation } from "../lib/areaInfo";
import {
  fetchSupportedFacilitiesCatalog,
  findNearestFacilitiesByKind,
  type NearbyFacilitySlot,
  type SupportedFacilityKind,
} from "../lib/streetFacilities";

type RecommendationFacilitiesPageProps = {
  area: AreaInfo;
  recommendation: AreaRecommendation;
  onBack: () => void;
};

function facilityIcon(kind: SupportedFacilityKind) {
  if (kind === "bicycle") return Bike;
  if (kind === "drinking") return Droplets;
  return Armchair;
}

function facilityAccent(kind: SupportedFacilityKind): string {
  if (kind === "bicycle") return "text-orange-600 bg-orange-50 border-orange-100";
  if (kind === "drinking") return "text-cyan-600 bg-cyan-50 border-cyan-100";
  return "text-purple-600 bg-purple-50 border-purple-100";
}

export default function RecommendationFacilitiesPage({
  area,
  recommendation,
  onBack,
}: RecommendationFacilitiesPageProps) {
  const [loading, setLoading] = useState(true);
  const [facilitySlots, setFacilitySlots] = useState<NearbyFacilitySlot[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setLoadError(null);

    fetchSupportedFacilitiesCatalog()
      .then((catalog) => {
        if (cancelled) return;
        setFacilitySlots(findNearestFacilitiesByKind(catalog, recommendation.lat, recommendation.lng, 500));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("[RecommendationFacilitiesPage] failed to load nearby facilities", error);
        setLoadError("We couldn't load nearby street facilities right now.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [recommendation.id, recommendation.lat, recommendation.lng]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-4 py-2 text-sm font-medium text-cyan-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {area.name}
        </button>

        <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/90 shadow-xl backdrop-blur">
          <div className="border-b border-cyan-100 bg-gradient-to-r from-cyan-600 via-sky-600 to-teal-500 px-6 py-8 text-white sm:px-8">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/20">
                <MapPinned className="h-8 w-8" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
                  Recommendation Detail
                </p>
                <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{recommendation.name}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/90 sm:text-base">
                  {recommendation.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white ring-1 ring-white/20">
                    {area.name}
                  </span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white ring-1 ring-white/20">
                    3 facility types checked within 500m
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
                  <Navigation className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700/80">
                    Nearby Public Facilities
                  </p>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Useful comfort support around this place
                  </h2>
                </div>
              </div>

              {loading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="animate-pulse rounded-3xl border border-gray-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="h-14 w-14 rounded-2xl bg-gray-200" />
                          <div className="min-w-0 flex-1">
                            <div className="h-5 w-44 rounded bg-gray-200" />
                            <div className="mt-2 h-4 w-28 rounded bg-gray-100" />
                          </div>
                        </div>
                        <div className="h-10 w-20 rounded bg-gray-100" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && loadError && (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-sm">
                  <div className="flex items-start gap-3">
                    <TriangleAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Street facilities are temporarily unavailable</p>
                      <p className="mt-1 text-sm leading-7">{loadError}</p>
                    </div>
                  </div>
                </div>
              )}

              {!loading && !loadError && (
                <div className="space-y-4">
                  {facilitySlots.map((slot) => {
                    const Icon = facilityIcon(slot.kind);
                    const facility = slot.facility;

                    return (
                      <article
                        key={slot.kind}
                        className={`rounded-3xl border bg-white p-4 shadow-sm transition ${
                          facility
                            ? "border-gray-100 hover:border-indigo-100 hover:shadow-md"
                            : "border-dashed border-slate-300 bg-slate-50/90"
                        }`}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-4">
                            <div
                              className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border ${
                                facility
                                  ? facilityAccent(slot.kind)
                                  : "border-slate-200 bg-slate-100 text-slate-500"
                              }`}
                            >
                              <Icon className="h-6 w-6" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="break-words text-lg font-semibold text-gray-900">
                                {facility
                                  ? facility.name
                                  : `No ${slot.typeLabel.toLowerCase()} nearby`}
                              </p>
                              <p className="mt-1 text-sm font-medium text-gray-500">
                                {slot.typeLabel}
                              </p>
                              {!facility && (
                                <p className="mt-2 text-sm leading-7 text-slate-600">
                                  No {slot.typeLabel.toLowerCase()} was found within 500m of this
                                  selected place.
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="sm:text-right">
                            {facility ? (
                              <>
                                <p className="text-3xl font-bold text-indigo-600">
                                  {facility.distanceMeters}m
                                </p>
                                <p className="text-sm text-gray-500">away</p>
                              </>
                            ) : (
                              <>
                                <p className="text-lg font-semibold text-slate-500">No match</p>
                                <p className="text-sm text-slate-400">within 500m</p>
                              </>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}

                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm leading-7 text-indigo-900">
                    <span className="font-semibold">Tip:</span> All facilities are based on the
                    same dataset used in the Street Facilities map layer. Each row checks one
                    facility type and shows the nearest match within 500m.
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
