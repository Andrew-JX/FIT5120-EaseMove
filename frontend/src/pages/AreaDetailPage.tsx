import { ArrowLeft, MapPin, Tag, TrendingUp, Navigation, Bike, Footprints, Route } from "lucide-react";
import {
  getAreaComfortRouteItems,
  getAreaRecommendationItems,
  type AreaComfortRoute,
  type AreaInfo,
} from "../lib/areaInfo";

type AreaDetailPageProps = {
  area: AreaInfo;
  onBack: () => void;
  onRecommendationClick: (recommendationId: string) => void;
  onComfortRouteClick: (route: AreaComfortRoute) => void;
};

export default function AreaDetailPage({
  area,
  onBack,
  onRecommendationClick,
  onComfortRouteClick,
}: AreaDetailPageProps) {
  const homeSecondSectionBackground =
    "linear-gradient(180deg, #122d2b 0%, #eef8f5 25%, #f7fbfa 75%, #122d2b 100%)";
  const mapButtonGradient = "linear-gradient(180deg, #122d2b 0%, #17413f 100%)";
  const recommendations = getAreaRecommendationItems(area);
  const comfortRoutes = getAreaComfortRouteItems(area);

  return (
    <div className="min-h-screen text-[#2a2a2a]" style={{ background: homeSecondSectionBackground }}>
      <div className="px-4 py-4 text-white">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-md border border-white/30 px-3 py-1.5 text-white/95 shadow-[0_8px_18px_rgba(0,0,0,0.18)] transition-colors hover:text-white"
          style={{
            backgroundImage: mapButtonGradient,
            backgroundColor: "#122d2b",
          }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Interactive Map</span>
        </button>
      </div>

      <div className="relative mb-8 px-4 pb-2 pt-10 sm:pt-12">
        <div className="mx-auto w-full max-w-6xl">
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="h-6 w-6 text-[#17413f]" />
              <span className="font-medium text-[#17413f]">Area Introduction</span>
            </div>
            <h1 className="mb-4 text-5xl font-bold text-[#10201f]">{area.name}</h1>
            <p className="max-w-3xl text-lg leading-relaxed text-[#294745]">{area.heroBlurb}</p>
          </div>
        </div>
      

      <div className="max-w-6xl mx-auto px-4 pb-12 space-y-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h2 className="mb-4 text-2xl font-bold text-[#2a2a2a]">Area Character</h2>
              <div className="rounded-2xl border border-[#d9d1c6] bg-[#fbf8f1]/95 p-6 shadow-[0_10px_28px_rgba(0,0,0,0.06)] backdrop-blur-sm">
                <p className="mb-6 leading-relaxed text-[#3b3b3b]">{area.description}</p>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="h-5 w-5 text-[#6f7f5c]" />
                    <h3 className="font-semibold text-[#2a2a2a]">Area Tags</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {area.tags.map((tag) => (
                      <span
                        key={tag.label}
                        className="rounded-full border border-[#9aa884] bg-[#eef3e6] px-4 py-2 text-sm font-medium text-[#4a5c3a]"
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-4">
              <div className="flex items-center gap-2 text-[#4a5c3a]">
                <TrendingUp className="w-6 h-6" />
                <span className="text-sm font-semibold uppercase tracking-[0.18em]">Recommendation</span>
              </div>
              <h2 className="mt-2 text-2xl font-bold text-[#2a2a2a]">Where to go?</h2>
            </div>
            <div className="space-y-3">
              {recommendations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onRecommendationClick(item.id)}
                  className="group w-full cursor-pointer rounded-xl border border-[#9aa884]/35 bg-gradient-to-b from-[#f6f3ea] to-[#f1ecdf] p-5 text-left shadow-[0_8px_22px_rgba(0,0,0,0.05)] transition-all hover:border-[#4a5c3a]/45 hover:bg-gradient-to-b hover:from-[#f1ecdf] hover:to-[#ece5d6]"
                >
                  <h3 className="mb-2 text-lg font-bold text-[#2a2a2a] transition-colors group-hover:text-[#4a5c3a]">
                    {item.name}
                  </h3>
                  <p className="mb-4 text-sm leading-relaxed text-[#4a4a4a]">{item.description}</p>
                  <span className="flex items-center gap-2 text-sm font-medium text-[#17413f] transition-colors group-hover:text-[#122d2b]">
                    <Navigation className="w-4 h-4" />
                    View nearby facilities
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-8">
          <div className="flex items-center gap-2 mb-5">
            <Footprints className="h-6 w-6 text-[#4a5c3a]" />
            <h2 className="text-2xl font-bold text-[#2a2a2a]">Comfort Routes</h2>
          </div>
          <p className="mb-6 text-[#5a5a5a]">Easy walking and cycling ideas</p>

          <div className="grid md:grid-cols-2 gap-4">
            {comfortRoutes.map((route) => (
              <button
                key={route.id}
                type="button"
                onClick={() => onComfortRouteClick(route)}
                className="group cursor-pointer rounded-xl border border-[#9aa884]/35 bg-gradient-to-b from-[#f6f3ea] to-[#f1ecdf] p-6 shadow-[0_8px_22px_rgba(0,0,0,0.05)] transition-all hover:border-[#4a5c3a]/45 hover:bg-gradient-to-b hover:from-[#f1ecdf] hover:to-[#ece5d6]"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 rounded-xl bg-[#e8efdd] p-3 text-[#4a5c3a] transition-transform group-hover:scale-110">
                    <Bike className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-2 text-lg font-bold text-[#2a2a2a] transition-colors group-hover:text-[#4a5c3a]">
                      {route.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[#4a4a4a]">{route.description}</p>
                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#4a5c3a]">
                      <Route className="h-4 w-4" />
                      <span>Open in 3D Route</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
