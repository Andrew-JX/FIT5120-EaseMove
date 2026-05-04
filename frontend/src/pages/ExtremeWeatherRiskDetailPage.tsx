import { ArrowLeft } from "lucide-react";
import { navigateTo } from "../lib/navigation";
import { extremeWeatherRisks } from "../data/extremeWeather";
import heroImage from "../assets/Heat.png";

function getSelectedRiskIdFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("risk") ?? extremeWeatherRisks[0].id;
}

export default function ExtremeWeatherRiskDetailPage() {
  const selectedRiskId = getSelectedRiskIdFromUrl();
  const selectedRisk = extremeWeatherRisks.find((risk) => risk.id === selectedRiskId) ?? extremeWeatherRisks[0];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#081515" }}>
      <section className="relative w-full min-h-[360px] sm:min-h-[420px] overflow-hidden">
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/25" />

        <header className="absolute top-0 left-0 w-full p-4 sm:p-5 flex items-center justify-start z-20">
          <button
            type="button"
            onClick={() => navigateTo("/extreme-weather-risks")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-semibold">Back</span>
          </button>
        </header>

        <div className="absolute left-0 bottom-0 z-10 px-4 sm:px-6 pb-10 sm:pb-12">
          <h1 className="text-white text-3xl sm:text-4xl md:text-5xl font-bold leading-tight max-w-3xl">
            {selectedRisk.shortLabel}
          </h1>
        </div>
      </section>

      <main className="px-4 sm:px-6 py-6">
        <div className="max-w-4xl mx-auto rounded-xl border border-gray-300 bg-white shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900">{selectedRisk.riskName}</h1>

          <section className="mt-6">
            <h2 className="text-xl font-extrabold text-gray-900">Why it happens</h2>
            <p className="text-sm text-gray-800 mt-2">{selectedRisk.whyItHappens}</p>
          </section>

          <section className="mt-6">
            <h2 className="text-xl font-extrabold text-gray-900">What you can do</h2>
            <ul className="mt-2 space-y-2">
              {selectedRisk.whatYouCanDo.map((item) => (
                <li key={item} className="text-sm text-gray-900">
                  • {item}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
