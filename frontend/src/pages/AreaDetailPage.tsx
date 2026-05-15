import { ArrowLeft, MapPin, Tag, TrendingUp, Navigation, Bike, Footprints } from "lucide-react";
import { getAreaRecommendationItems, type AreaInfo } from "../lib/areaInfo";

type AreaDetailPageProps = {
  area: AreaInfo;
  onBack: () => void;
  onRecommendationClick: (recommendationId: string) => void;
};

export default function AreaDetailPage({
  area,
  onBack,
  onRecommendationClick,
}: AreaDetailPageProps) {
  const recommendations = getAreaRecommendationItems(area);
  const heroImage = "https://images.unsplash.com/photo-1542159919831-40fb0656b45a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#081515" }}>
      <div className="px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Interactive Map</span>
        </button>
      </div>

      <div className="relative h-72 overflow-hidden mb-8">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${heroImage}')` }}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[#081515]" />
        </div>

        <div className="relative z-10 px-4 h-full flex items-end pb-8">
          <div className="max-w-6xl mx-auto w-full">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-6 h-6 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Area Introduction</span>
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">{area.name}</h1>
            <p className="text-white/90 text-lg max-w-3xl leading-relaxed">{area.heroBlurb}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-12 space-y-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Area Character</h2>
              <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
                <p className="text-slate-300 leading-relaxed mb-6">{area.description}</p>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-5 h-5 text-slate-400" />
                    <h3 className="font-semibold text-white">Area Tags</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {area.tags.map((tag) => (
                      <span
                        key={tag.label}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-300 rounded-full text-sm font-medium"
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
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              <h2 className="text-2xl font-bold text-white">Where to go?</h2>
            </div>
            <div className="space-y-3">
              {recommendations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onRecommendationClick(item.id)}
                  className="w-full text-left bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-700/50 p-5 hover:border-emerald-500/50 transition-all group cursor-pointer"
                >
                  <h3 className="font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-slate-400 text-sm mb-4 leading-relaxed">{item.description}</p>
                  <span className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
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
            <Footprints className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Comfort Routes</h2>
          </div>
          <p className="text-slate-400 mb-6">Easy walking and cycling ideas</p>

          <div className="grid md:grid-cols-2 gap-4">
            {area.comfortRoutes.map((route) => (
              <article
                key={route.title}
                className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 hover:border-blue-500/50 transition-all group cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400 group-hover:scale-110 transition-transform shrink-0">
                    <Bike className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg mb-2 group-hover:text-blue-400 transition-colors">
                      {route.title}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{route.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
