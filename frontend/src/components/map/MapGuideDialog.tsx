import { useEffect, useMemo, useRef, useState } from "react";
import { animate, utils } from "animejs";
import {
  Compass,
  Layers3,
  ListFilter,
  MapPinned,
  MousePointerClick,
  X,
} from "lucide-react";
import type { Precinct } from "../../lib/api";
import tips3Image from "../../assets/tips3.png";

type MapGuideDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topPrecincts: Precinct[];
  loading: boolean;
  onPrecinctSelect: (precinct: Precinct) => void;
};

type GuideStep = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const GUIDE_STEPS: GuideStep[] = [
  {
    id: "filters",
    title: "Choose what appears on the map",
    description:
      "Comfort Area shows precinct scores and lets you open each score card. Ease Places highlights indoor or low-stress destinations to explore. Street Facilities shows nearby bike racks, fountains, and seating. Natural Places adds parks and water areas for greener or cooler routes.",
    icon: ListFilter,
  },
  {
    id: "legend",
    title: "Read the colours quickly",
    description:
      "Green means Comfortable (70 to 100). Yellow means Caution (40 to 69). Red means High Risk (0 to 39). Grey means the precinct does not currently have live sensor coverage.",
    icon: Layers3,
  },
  {
    id: "top-five",
    title: "Current top five precincts",
    description:
      "Scores combine temperature, humidity, and crowd level. You can rebalance that mix in Comfort Preferences.",
    icon: Compass,
  },
  {
    id: "explore",
    title: "Tap or click to explore deeper",
    description:
      "Click a comfort marker to open its detail card and see live conditions. Click a highlighted area boundary to open the area introduction page. Switch to Compare to pick two precincts side by side. Use the Tips button any time you want to reopen this guide.",
    icon: MousePointerClick,
  },
];

export default function MapGuideDialog({
  open,
  onOpenChange,
  topPrecincts,
  loading,
  onPrecinctSelect,
}: MapGuideDialogProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [mounted, setMounted] = useState(open);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const imageRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;

    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    const image = imageRef.current;
    const body = bodyRef.current;
    const footer = footerRef.current;
    if (!backdrop || !panel || !image || !body || !footer) return;

    utils.remove([backdrop, panel, image, body, footer]);

    if (open) {
      animate(backdrop, {
        opacity: [0, 1],
        duration: 220,
        ease: "out(2)",
      });

      animate(panel, {
        opacity: [0, 1],
        duration: 320,
        ease: "out(2)",
      });

      animate(image, {
        opacity: [0, 1],
        translateY: [14, 0],
        duration: 420,
        delay: 260,
        ease: "out(3)",
      });

      animate(body, {
        opacity: [0, 1],
        translateY: [14, 0],
        duration: 440,
        delay: 480,
        ease: "out(3)",
      });

      animate(footer, {
        opacity: [0, 1],
        translateY: [14, 0],
        duration: 440,
        delay: 730,
        ease: "out(3)",
      });
      return;
    }

    animate(backdrop, {
      opacity: [1, 0],
      duration: 180,
      ease: "in(2)",
    });

    animate(panel, {
      translateY: -420,
      opacity: 0,
      scale: 0.9,
      duration: 620,
      ease: "inBack(1.4)",
      onComplete: () => setMounted(false),
    });
  }, [open, mounted]);

  useEffect(() => {
    if (!open || !mounted) return;
    const image = imageRef.current;
    const body = bodyRef.current;
    const footer = footerRef.current;
    if (!image || !body || !footer) return;

    utils.remove([image, body, footer]);
    animate([image, body, footer], { opacity: 0, translateY: 12, duration: 0 });

    animate(image, {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 360,
      ease: "out(3)",
    });
    animate(body, {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 380,
      delay: 190,
      ease: "out(3)",
    });
    animate(footer, {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 380,
      delay: 340,
      ease: "out(3)",
    });
  }, [stepIndex, open, mounted]);

  const currentStep = GUIDE_STEPS[stepIndex];
  const StepIcon = currentStep.icon;
  const topFivePreview = useMemo(() => topPrecincts.slice(0, 5), [topPrecincts]);

  if (!mounted) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[620]">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-[#0c1716]/16 backdrop-blur-[2px]"
        style={{ opacity: 0 }}
      />

      <section
        ref={panelRef}
        className="pointer-events-auto absolute left-1/2 top-1/2 w-[min(640px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] border border-[#d9e5e2] shadow-[0_28px_80px_rgba(10,24,23,0.2)]"
        style={{
          opacity: 0,
          background: "linear-gradient(180deg, #122d2b 0%, #eef8f5 25%, #f7fbfa 75%, #122d2b 100%)",
        }}
      >
        <div className="flex items-center justify-between border-b border-white/25 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2 text-white">
            <MapPinned className="h-5 w-5" />
            <span className="text-sm font-semibold tracking-[0.14em] uppercase">Tips Guide</span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/35 bg-white/12 text-white transition hover:bg-white/20"
            aria-label="Close tips guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          <div
            ref={imageRef}
            className={`mb-4 ${
              currentStep.id === "legend"
                ? ""
                : "rounded-2xl border border-[#c7dbd6] bg-white/70 p-4 shadow-[0_10px_22px_rgba(10,24,23,0.08)] backdrop-blur-sm"
            }`}
            style={{ opacity: 0 }}
          >
            {currentStep.id === "legend" ? (
              <img
                src={tips3Image}
                alt="Legend guide preview"
                className="h-40 w-full rounded-2xl object-cover sm:h-48"
              />
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#d4e3df] bg-gradient-to-b from-[#122d2b] to-[#17413f] text-white">
                  <StepIcon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5f8682]">
                    Step {stepIndex + 1} of {GUIDE_STEPS.length}
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-[#10201f] sm:text-2xl">{currentStep.title}</h3>
                </div>
              </div>
            )}
          </div>

          <div
            ref={bodyRef}
            className="mb-5 min-h-[142px] rounded-2xl border border-[#d9d1c6] bg-[#f5f0e8]/95 p-4 text-sm leading-7 text-[#3f5f5b] shadow-[0_8px_18px_rgba(10,24,23,0.05)] sm:p-5"
            style={{ opacity: 0 }}
          >
            <p>{currentStep.description}</p>

            {currentStep.id === "top-five" ? (
              <div className="mt-3 space-y-2">
                {loading ? (
                  <div className="rounded-xl border border-dashed border-[#cbdad6] bg-[#f5faf9] px-3 py-2 text-xs text-[#5f8682]">
                    Loading current top five precincts...
                  </div>
                ) : topFivePreview.length > 0 ? (
                  topFivePreview.map((precinct, index) => (
                    <button
                      type="button"
                      key={precinct.id}
                      onClick={() => onPrecinctSelect(precinct)}
                      className="flex w-full items-center justify-between rounded-xl border border-[#d7e4e0] bg-white px-3 py-2 text-left transition hover:border-[#bfd6d1]"
                    >
                      <span className="text-xs font-semibold text-[#10201f]">
                        {index + 1}. {precinct.name}
                      </span>
                      <span className="rounded-full bg-[#eef3e6] px-2 py-0.5 text-[11px] font-semibold text-[#4a5c3a]">
                        {precinct.comfort_score}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-[#cbdad6] bg-[#f5faf9] px-3 py-2 text-xs text-[#5f8682]">
                    Top five data will appear once map data is ready.
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div ref={footerRef} className="flex items-center justify-between gap-3" style={{ opacity: 0 }}>
            <div className="flex items-center gap-2">
              {GUIDE_STEPS.map((step, index) => (
                <span
                  key={step.id}
                  className={`h-2.5 w-2.5 rounded-full transition-all duration-250 ${
                    index === stepIndex ? "bg-[#17413f]" : "bg-[#b7cbc7]"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStepIndex((value) => Math.max(value - 1, 0))}
                disabled={stepIndex === 0}
                className={`rounded-md border px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] shadow-[0_10px_20px_rgba(10,24,23,0.2)] transition ${
                  stepIndex === 0
                    ? "cursor-not-allowed border-[#c9d8d4] bg-[#dde8e5] text-[#7a918d]"
                    : "border-white/30 bg-gradient-to-b from-[#122d2b] to-[#17413f] text-white hover:brightness-110"
                }`}
              >
                Previous
              </button>

              {stepIndex < GUIDE_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStepIndex((value) => Math.min(value + 1, GUIDE_STEPS.length - 1))}
                  className="rounded-md border border-white/30 bg-gradient-to-b from-[#122d2b] to-[#17413f] px-5 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-white shadow-[0_10px_20px_rgba(10,24,23,0.2)] transition hover:brightness-110"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-md border border-white/30 bg-gradient-to-b from-[#122d2b] to-[#17413f] px-5 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-white shadow-[0_10px_20px_rgba(10,24,23,0.2)] transition hover:brightness-110"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
