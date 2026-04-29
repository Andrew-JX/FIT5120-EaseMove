import {
  ArrowLeft,
  BookOpenText,
  Compass,
  Footprints,
  MapPinned,
} from "lucide-react";
import type { AreaInfo } from "../lib/areaInfo";

type AreaDetailPageProps = {
  area: AreaInfo;
  onBack: () => void;
};

export default function AreaDetailPage({ area, onBack }: AreaDetailPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-cyan-50/30 to-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-medium text-teal-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Interactive Map
        </button>

        <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/90 shadow-xl backdrop-blur">
          <div className="border-b border-teal-100 bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-500 px-6 py-8 text-white sm:px-8">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/20">
                <MapPinned className="h-8 w-8" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
                  Area Introduction
                </p>
                <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{area.name}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85 sm:text-base">
                  {area.heroBlurb}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 to-cyan-50 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md">
                  <BookOpenText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700/80">
                    Area Character
                  </p>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {"🌿 "}What {area.name} feels like?
                  </h2>
                </div>
              </div>
              <p className="text-base leading-8 text-gray-700">{area.description}</p>

              <div className="mt-8 border-t border-teal-200/70 pt-6">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700/80">
                    Area Tags
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-gray-900">
                    Quickly understand the neighbourhood
                  </h3>
                </div>

                <div className="flex flex-wrap gap-3">
                  {area.tags.map((tag) => (
                    <div
                      key={tag.label}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/80 bg-white/75 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm"
                    >
                      <span className="text-base">{tag.icon}</span>
                      <span>{tag.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-cyan-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-md">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700/80">
                    Recommendation
                  </p>
                  <h2 className="text-2xl font-bold text-gray-900">{"🧭 "}Where to go ?</h2>
                </div>
              </div>

              <div className="space-y-3">
                {area.recommendations.map((item, index) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-gray-100 bg-gradient-to-r from-white to-cyan-50/50 p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-7 text-gray-700 sm:text-base">{item}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="px-6 pb-6 sm:px-8 sm:pb-8">
            <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/40 to-cyan-50/40 p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
                  <Footprints className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700/80">
                    Comfort Routes
                  </p>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Easy walking and cycling ideas
                  </h2>
                </div>
              </div>

              <div className="space-y-4">
                {area.comfortRoutes.map((route) => (
                  <article
                    key={route.title}
                    className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm ring-1 ring-emerald-100/70"
                  >
                    <h3 className="text-lg font-semibold text-gray-900">{route.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-gray-700 sm:text-base">
                      {route.description}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
