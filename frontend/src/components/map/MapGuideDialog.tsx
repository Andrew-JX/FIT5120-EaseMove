import {
  Compass,
  Layers3,
  ListFilter,
  MapPinned,
  Minimize2,
  MousePointerClick,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Precinct } from "../../lib/api";

type MapGuideDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topPrecincts: Precinct[];
  loading: boolean;
  onPrecinctSelect: (precinct: Precinct) => void;
};

function scoreTone(label: Precinct["comfort_label"]): string {
  if (label === "Comfortable") return "bg-emerald-500/12 text-emerald-700 border-emerald-200";
  if (label === "Caution") return "bg-amber-500/12 text-amber-700 border-amber-200";
  return "bg-rose-500/12 text-rose-700 border-rose-200";
}

export default function MapGuideDialog({
  open,
  onOpenChange,
  topPrecincts,
  loading,
  onPrecinctSelect,
}: MapGuideDialogProps) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="pointer-events-none fixed inset-0 z-[620]">
          <motion.button
            type="button"
            aria-label="Close tips guide"
            className="absolute inset-0 bg-[#0c1716]/14 backdrop-blur-[2px] pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={() => onOpenChange(false)}
          />

          <motion.section
            className="pointer-events-auto absolute left-1/2 top-1/2 max-h-[calc(100vh-3rem)] w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[30px] border border-[#d9e5e2] bg-[#fcfefd] shadow-[0_28px_80px_rgba(10,24,23,0.18)]"
            initial={{ opacity: 0, scale: 0.88, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 14 }}
            transition={{ type: "spring", stiffness: 280, damping: 30, mass: 0.85 }}
            style={{ transformOrigin: "center center" }}
          >
            <div className="overflow-hidden rounded-[28px]">
              <div className="border-b border-[#e5efec] bg-white px-6 py-6 sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e2ece9] bg-[#f3f8f7] text-[#17413f]">
                      <MapPinned className="h-7 w-7" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-2xl font-bold text-[#10201f] sm:text-3xl">Interactive Map Quick Guide</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-7 text-[#4f6b67]">
                        This short guide explains what the map shows, how the filters work,
                        and how to read the current comfort scores before you choose where to go.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e2ece9] bg-[#f8fbfa] text-[#456765] transition hover:bg-[#f1f6f5] hover:text-[#17413f]"
                      aria-label="Minimise tips guide"
                      title="Minimise"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e2ece9] bg-[#f8fbfa] text-[#456765] transition hover:bg-[#f1f6f5] hover:text-[#17413f]"
                      aria-label="Close tips guide"
                      title="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-0 px-6 py-4 sm:px-8 sm:py-5">
                <section className="border-b border-[#edf2f1] py-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e2ece9] bg-[#f5f8f8] text-[#17413f]">
                      <ListFilter className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5f8682]">
                        Filters
                      </p>
                      <h3 className="text-xl font-bold text-[#10201f]">Choose what appears on the map</h3>
                    </div>
                  </div>
                  <div className="space-y-2.5 text-sm leading-7 text-[#456765]">
                    <p>Comfort Area shows precinct scores and lets you open each score card.</p>
                    <p>Ease Places highlights indoor or low-stress destinations to explore.</p>
                    <p>Street Facilities shows nearby bike racks, fountains, and seating.</p>
                    <p>Natural Places adds parks and water areas for greener or cooler routes.</p>
                  </div>
                </section>

                <section className="border-b border-[#edf2f1] py-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e2ece9] bg-[#f5f8f8] text-[#17413f]">
                      <Layers3 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5f8682]">
                        Legend
                      </p>
                      <h3 className="text-xl font-bold text-[#10201f]">Read the colours quickly</h3>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm leading-7 text-[#456765]">
                    <div className="flex items-center gap-3">
                      <span className="h-3.5 w-3.5 rounded-full bg-green-500" />
                      <span>Comfortable means a score from 70 to 100.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="h-3.5 w-3.5 rounded-full bg-yellow-500" />
                      <span>Caution means a score from 40 to 69.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="h-3.5 w-3.5 rounded-full bg-red-500" />
                      <span>High Risk means a score from 0 to 39.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="h-3.5 w-3.5 rounded-full bg-slate-400" />
                      <span>No sensor data means the precinct does not currently have live sensor coverage.</span>
                    </div>
                  </div>
                </section>

                <section className="border-b border-[#edf2f1] py-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e2ece9] bg-[#f5f8f8] text-[#17413f]">
                      <Compass className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5f8682]">
                        Comfort Score
                      </p>
                      <h3 className="text-xl font-bold text-[#10201f]">Current top five precincts</h3>
                    </div>
                  </div>
                  <p className="mb-4 text-sm leading-7 text-[#456765]">
                    Scores combine temperature, humidity, and crowd level. You can rebalance
                    that mix in Comfort Preferences.
                  </p>
                  <div className="space-y-3">
                    {loading ? (
                      <div className="rounded-2xl border border-dashed border-[#d6e5e1] bg-[#fafcfc] px-4 py-5 text-sm text-[#5f8682]">
                        Loading the current top five comfort scores...
                      </div>
                    ) : topPrecincts.length > 0 ? (
                      topPrecincts.map((precinct, index) => (
                        <button
                          type="button"
                          key={precinct.id}
                          onClick={() => onPrecinctSelect(precinct)}
                          className="flex w-full items-center justify-between rounded-2xl border border-[#e4ecea] bg-[#fbfdfd] px-4 py-3 text-left transition hover:border-[#bfd6d1] hover:bg-white hover:shadow-[0_10px_24px_rgba(10,24,23,0.07)] focus:outline-none focus:ring-2 focus:ring-[#83c5be]/45"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#10201f]">
                              {index + 1}. {precinct.name}
                            </p>
                            <p className="mt-1 text-xs text-[#5f8682]">
                              {precinct.id === "flemington" ? "No live sensors" : "Live sensor score"}
                            </p>
                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#006d77]">
                              Open in 3D Route
                            </p>
                          </div>
                          <div
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${scoreTone(
                              precinct.comfort_label
                            )}`}
                          >
                            {precinct.comfort_score} / 100
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[#d6e5e1] bg-[#fafcfc] px-4 py-5 text-sm text-[#5f8682]">
                        Top-five scores will appear here once map data is available.
                      </div>
                    )}
                  </div>
                </section>

                <section className="py-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e2ece9] bg-[#f5f8f8] text-[#17413f]">
                      <MousePointerClick className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5f8682]">
                        How To Use It
                      </p>
                      <h3 className="text-xl font-bold text-[#10201f]">Tap or click to explore deeper</h3>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm leading-7 text-[#456765]">
                    <p>Click a comfort marker to open its detail card and see live conditions.</p>
                    <p>Click a highlighted area boundary to open the area introduction page.</p>
                    <p>Switch to Compare to pick two precincts side by side.</p>
                    <p>Use the Tips button any time you want to reopen this guide.</p>
                  </div>
                  <div className="mt-5 rounded-2xl border border-[#e4ecea] bg-[#f8fbfa] p-4">
                    <div className="mb-2 flex items-center gap-2 text-[#17413f]">
                      <SlidersHorizontal className="h-4 w-4" />
                      <p className="text-sm font-semibold">Comfort Preferences</p>
                    </div>
                    <p className="text-sm leading-7 text-[#456765]">
                      The sliders let you tell the system what matters more to you.
                      Higher temperature weight means the ranking reacts more strongly to heat.
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
