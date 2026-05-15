import { useEffect, useState } from "react";
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

  const heroImage = "https://images.unsplash.com/photo-1542159919831-40fb0656b45a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#081515" }}>
      <div className="relative h-48 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${heroImage}')` }}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-transparent" />
        </div>

        <div className="relative z-10 px-4 py-6">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to {area.name}</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-20 pb-8 space-y-6">
        <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-lg rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">Recommendation Detail</span>
            </div>

            <h1 className="text-3xl font-bold text-white mb-3">{recommendation.name}</h1>
            <p className="text-slate-300 leading-relaxed mb-4">{recommendation.description}</p>

            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 bg-slate-700/50 text-slate-300 text-sm rounded-full border border-slate-600/50">
                {area.name}
              </span>
              <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-sm rounded-full border border-emerald-500/30">
                500m search radius
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-white mb-2">Nearby Public Facilities</h2>
            <p className="text-slate-400 text-sm">Useful comfort support around this place</p>
          </div>

          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-800/50 rounded-xl h-32 animate-pulse border border-slate-700/30" />
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
                    className="bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-700/50 p-5 hover:border-emerald-500/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-3 ${tone.bg} rounded-xl ${tone.color} group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white text-sm">{facilityTypeLabel(slot.kind)}</h3>
                      </div>
                    </div>

                    {facility ? (
                      <div className="space-y-2">
                        <div className="text-slate-300 font-medium">{facility.name}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs px-2.5 py-1 bg-slate-700/50 text-slate-400 rounded-full">
                            {facilityTypeLabel(slot.kind)}
                          </span>
                          <span className="text-emerald-400 text-sm font-semibold">{facility.distanceMeters}m away</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-slate-500 italic">No nearby facility</div>
                        <div className="text-xs text-slate-600">No match within 500m</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/40 p-5">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-slate-300 leading-relaxed">
              <span className="font-semibold text-blue-400">Tip: </span>
              Facility data is sourced from the same mapped facility dataset and limited to a 500m radius. If this location is near an area boundary, some nearby facilities may not appear in the results.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
