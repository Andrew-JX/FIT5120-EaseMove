import { useState } from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { navigateTo } from "../lib/navigation";

const extremeWeatherRisks = [
  {
    id: "heat",
    title: "Heat Stress & Heatwave",
    shortLabel: "Heatwave",
    whyItHappens: "High temperature, direct sun, and long outdoor exposure raise body heat quickly.",
    healthImpacts: "Can cause dehydration, dizziness, headache, heat exhaustion, and in severe cases heat stroke.",
    howToRespond: "Drink water often, use shade, reduce intense activity, and plan travel in cooler morning/evening hours.",
  },
  {
    id: "air-pollution",
    title: "Air Pollution Exposure",
    shortLabel: "Air Pollution",
    whyItHappens: "PM2.5 and other pollutants can rise with traffic, smoke, and stagnant weather.",
    healthImpacts: "May trigger breathing discomfort, throat or eye irritation, coughing, and worsen asthma symptoms.",
    howToRespond: "Choose lower-traffic routes, reduce heavy outdoor exercise, and shorten time outside when air is poor.",
  },
  {
    id: "crowding",
    title: "Crowding-Related Discomfort",
    shortLabel: "Crowding",
    whyItHappens: "Dense pedestrian activity increases heat load and stress in busy corridors.",
    healthImpacts: "Can increase fatigue, discomfort, and stress, especially during warm conditions.",
    howToRespond: "Use less crowded paths, allow extra time, and take short rest stops in cooler spaces.",
  },
  {
    id: "wind",
    title: "Strong Wind Exposure",
    shortLabel: "Strong Wind",
    whyItHappens: "Wind funnels between buildings and open intersections can increase sudden gusts.",
    healthImpacts: "Can reduce comfort, cause eye irritation from dust, and make cycling or walking less stable.",
    howToRespond: "Slow down in exposed streets, avoid risky crossings, and choose sheltered routes where possible.",
  },
] as const;

export default function ExtremeWeatherRisksPage() {
  const [selectedRiskId, setSelectedRiskId] = useState<string>(extremeWeatherRisks[0].id);
  const selectedRisk = extremeWeatherRisks.find((risk) => risk.id === selectedRiskId) ?? extremeWeatherRisks[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50/30 to-gray-100">
      <nav className="bg-white/85 backdrop-blur-md shadow-sm border-b border-white/20">
        <div className="px-6 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigateTo("/map")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-semibold">Back to Map</span>
          </button>
          <div className="inline-flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-semibold">Extreme Weather Risks</span>
          </div>
        </div>
      </nav>

      <main className="px-4 sm:px-6 py-6">
        <div className="max-w-6xl mx-auto rounded-xl border border-gray-300 bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]">
            <section className="bg-gradient-to-b from-amber-50 to-orange-50 p-4">
              <h2 className="text-sm font-bold text-amber-900 mb-3">Risk Topics</h2>
              <div className="space-y-2">
                {extremeWeatherRisks.map((risk) => {
                  const isActive = selectedRiskId === risk.id;
                  return (
                    <button
                      key={risk.id}
                      type="button"
                      onMouseEnter={() => setSelectedRiskId(risk.id)}
                      onFocus={() => setSelectedRiskId(risk.id)}
                      onClick={() => setSelectedRiskId(risk.id)}
                      className={`w-full text-left rounded-lg border p-3 transition-all ${
                        isActive
                          ? "border-amber-500 bg-white shadow-sm"
                          : "border-amber-200/70 bg-white/60 hover:bg-white"
                      }`}
                    >
                      <p className="text-sm font-bold text-gray-900">{risk.shortLabel}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="p-5 border-t-2 border-black lg:border-t-0 lg:border-l-2">
              <h1 className="text-xl font-bold text-gray-900">{selectedRisk.title}</h1>

              <div className="mt-5">
                <h3 className="text-lg font-extrabold text-gray-900">Why It Happens</h3>
                <p className="text-sm text-gray-800 mt-2">{selectedRisk.whyItHappens}</p>

                <h3 className="text-lg font-extrabold text-gray-900 mt-6">Potential Health Impacts</h3>
                <p className="text-sm text-gray-900 mt-2">{selectedRisk.healthImpacts}</p>

                <h3 className="text-lg font-extrabold text-gray-900 mt-6">How To Respond</h3>
                <p className="text-sm text-gray-900 mt-2">{selectedRisk.howToRespond}</p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
