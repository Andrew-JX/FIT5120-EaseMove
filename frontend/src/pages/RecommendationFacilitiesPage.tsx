import { useEffect, useRef, useState } from "react";
import { animate, utils } from "animejs";
import { ArrowLeft, Bike, Droplet, Armchair, MapPin, AlertCircle, Info } from "lucide-react";
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
  if (kind === "drinking") return Droplet;
  return Armchair;
}

function facilityTypeLabel(kind: SupportedFacilityKind): string {
  if (kind === "bicycle") return "Bike Facilities";
  if (kind === "drinking") return "Drinking Water";
  return "Rest Areas";
}

function facilityTone(kind: SupportedFacilityKind): { color: string; bg: string } {
  if (kind === "bicycle") return { color: "text-blue-400", bg: "bg-blue-500/20" };
  if (kind === "drinking") return { color: "text-cyan-400", bg: "bg-cyan-500/20" };
  return { color: "text-purple-400", bg: "bg-purple-500/20" };
}

export default function RecommendationFacilitiesPage({
  area,
  recommendation,
  onBack,
}: RecommendationFacilitiesPageProps) {
  const pageRef = useRef<HTMLDivElement | null>(null);
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
        setLoadError("Unable to retrieve nearby facilities. Please try again later.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [recommendation.id, recommendation.lat, recommendation.lng]);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-reco-facility-reveal]"));
    if (nodes.length === 0) return;
    utils.remove(nodes);
    animate(nodes, { opacity: 0, translateY: 18, duration: 0 });
    animate(nodes, {
      opacity: [0, 1],
      translateY: [18, 0],
      delay: utils.stagger(160),
      duration: 520,
      ease: "out(3)",
    });
  }, [recommendation.id, loading, loadError]);

  const pageBackground = "linear-gradient(180deg, #122d2b 0%, #eef8f5 25%, #f7fbfa 75%, #122d2b 100%)";

  return (
    <div ref={pageRef} className="min-h-screen" style={{ background: pageBackground }}>
      <div data-reco-facility-reveal className="relative h-48 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,45,43,0.9)_0%,rgba(23,65,63,0.7)_48%,rgba(238,248,245,0.95)_100%)]">
          <div className="absolute inset-x-0 top-0 h-[46%] bg-[radial-gradient(circle_at_50%_0%,rgba(131,197,190,0.22),transparent_64%)]" />
        </div>

        <div className="relative z-10 px-4 py-6">
          <button
            type="button"
            onClick={onBack}
            className="mb-4 flex items-center gap-2 rounded-md border border-white/30 bg-gradient-to-b from-[#122d2b] to-[#17413f] px-3 py-1.5 text-white/95 shadow-[0_8px_18px_rgba(0,0,0,0.18)] transition-colors hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to {area.name}</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-20 pb-8 space-y-6">
        <div data-reco-facility-reveal className="overflow-hidden rounded-2xl border border-[#d9d1c6] bg-[#fbf8f1]/95 shadow-[0_10px_28px_rgba(0,0,0,0.06)] backdrop-blur-lg">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-5 w-5 text-[#4a5c3a]" />
              <span className="text-sm font-medium text-[#4a5c3a]">Recommendation Detail</span>
            </div>

            <h1 className="mb-3 text-3xl font-bold text-[#2a2a2a]">{recommendation.name}</h1>
            <p className="mb-4 leading-relaxed text-[#4a4a4a]">{recommendation.description}</p>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[#d0c8bb] bg-[#f1ecdf] px-3 py-1.5 text-sm text-[#3d3d3d]">
                {area.name}
              </span>
              <span className="rounded-full border border-[#9aa884] bg-[#eef3e6] px-3 py-1.5 text-sm text-[#4a5c3a]">
                500m search radius
              </span>
            </div>
          </div>
        </div>

        <div data-reco-facility-reveal>
          <div className="mb-5">
            <h2 className="mb-2 text-2xl font-bold text-[#2a2a2a]">Nearby Public Facilities</h2>
            <p className="text-sm text-[#5a5a5a]">Useful comfort support around this place</p>
          </div>

          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-xl border border-[#d9d1c6] bg-[#f1ecdf]/70" />
              ))}
            </div>
          )}

          {!loading && loadError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-400 font-semibold mb-1">Failed to load facilities</h3>
                <p className="text-red-300/80 text-sm">{loadError}</p>
              </div>
            </div>
          )}

          {!loading && !loadError && (
            <div className="grid md:grid-cols-3 gap-4">
              {facilitySlots.map((slot) => {
                const Icon = facilityIcon(slot.kind);
                const tone = facilityTone(slot.kind);
                const facility = slot.facility;

                return (
                  <div
                    key={slot.kind}
                    className="group cursor-pointer rounded-xl border border-[#d9d1c6] bg-[#fbf8f1]/95 p-5 shadow-[0_8px_22px_rgba(0,0,0,0.05)] transition-all hover:border-[#9aa884]"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-3 ${tone.bg} rounded-xl ${tone.color} group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-[#2a2a2a]">{facilityTypeLabel(slot.kind)}</h3>
                      </div>
                    </div>

                    {facility ? (
                      <div className="space-y-2">
                        <div className="font-medium text-[#3d3d3d]">{facility.name}</div>
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-[#f1ecdf] px-2.5 py-1 text-xs text-[#5a5a5a]">
                            {facilityTypeLabel(slot.kind)}
                          </span>
                          <span className="text-sm font-semibold text-[#4a5c3a]">{facility.distanceMeters}m away</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="italic text-[#666666]">No nearby facility</div>
                        <div className="text-xs text-[#777777]">No match within 500m</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div data-reco-facility-reveal className="rounded-xl border border-[#d9d1c6] bg-[#fbf8f1]/95 p-5 shadow-[0_8px_22px_rgba(0,0,0,0.05)] backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#4a5c3a]" />
            <div className="text-sm leading-relaxed text-[#4a4a4a]">
              <span className="font-semibold text-[#4a5c3a]">Tip: </span>
              Facility data is sourced from the same mapped facility dataset and limited to a 500m radius. If this location is near an area boundary, some nearby facilities may not appear in the results.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
