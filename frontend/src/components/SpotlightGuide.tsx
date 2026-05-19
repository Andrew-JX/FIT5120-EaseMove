import { type RefObject, useEffect, useLayoutEffect, useMemo, useState } from "react";

export type SpotlightGuideStep = {
  id: string;
  title: string;
  description: string;
  targetRef: RefObject<HTMLElement | null>;
  placement?: "bottom" | "top" | "auto";
};

export type SpotlightGuideProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: SpotlightGuideStep[];
  currentStepIndex: number;
  onNext: () => void;
  onSkip: () => void;
};

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

const CARD_WIDTH = 320;
const CARD_GAP = 16;
const VIEWPORT_PADDING = 16;
const HIGHLIGHT_PADDING = 10;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function rectEquals(left: Rect | null, right: Rect | null) {
  if (!left || !right) return left === right;
  return (
    left.top === right.top &&
    left.left === right.left &&
    left.width === right.width &&
    left.height === right.height &&
    left.right === right.right &&
    left.bottom === right.bottom
  );
}

function measureTarget(target: HTMLElement): Rect {
  const bounds = target.getBoundingClientRect();
  const top = clamp(bounds.top - HIGHLIGHT_PADDING, VIEWPORT_PADDING, window.innerHeight - VIEWPORT_PADDING);
  const left = clamp(bounds.left - HIGHLIGHT_PADDING, VIEWPORT_PADDING, window.innerWidth - VIEWPORT_PADDING);
  const right = clamp(bounds.right + HIGHLIGHT_PADDING, VIEWPORT_PADDING, window.innerWidth - VIEWPORT_PADDING);
  const bottom = clamp(bounds.bottom + HIGHLIGHT_PADDING, VIEWPORT_PADDING, window.innerHeight - VIEWPORT_PADDING);

  return {
    top,
    left,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

export default function SpotlightGuide({
  open,
  onOpenChange,
  steps,
  currentStepIndex,
  onNext,
  onSkip,
}: SpotlightGuideProps) {
  const [highlightRect, setHighlightRect] = useState<Rect | null>(null);

  const currentStep = steps[currentStepIndex] ?? null;

  useEffect(() => {
    if (!open || !currentStep) return;
    const target = currentStep.targetRef.current;
    if (!target) return;

    if (typeof target.scrollIntoView === "function") {
      target.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "auto",
      });
    }
  }, [currentStep, open]);

  useLayoutEffect(() => {
    if (!open || !currentStep) {
      setHighlightRect(null);
      return;
    }

    let frameId = 0;

    const measure = () => {
      const target = currentStep.targetRef.current;
      if (!target) {
        setHighlightRect(null);
        return;
      }
      const nextRect = measureTarget(target);
      setHighlightRect((previous) => (rectEquals(previous, nextRect) ? previous : nextRect));
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();

    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", scheduleMeasure, true);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            scheduleMeasure();
          })
        : null;

    if (resizeObserver && currentStep.targetRef.current) {
      resizeObserver.observe(currentStep.targetRef.current);
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure, true);
      resizeObserver?.disconnect();
    };
  }, [currentStep, open]);

  const cardPosition = useMemo(() => {
    if (!highlightRect) {
      const preferredWidth = Math.min(CARD_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2);
      return {
        left: Math.max(VIEWPORT_PADDING, (window.innerWidth - preferredWidth) / 2),
        top: VIEWPORT_PADDING,
        width: preferredWidth,
      };
    }

    const preferredWidth = Math.min(CARD_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2);
    const left = clamp(
      highlightRect.left,
      VIEWPORT_PADDING,
      Math.max(VIEWPORT_PADDING, window.innerWidth - preferredWidth - VIEWPORT_PADDING)
    );

    const defaultTop = highlightRect.bottom + CARD_GAP;
    const topCandidate = defaultTop + 220 <= window.innerHeight - VIEWPORT_PADDING;
    const shouldPlaceOnTop =
      currentStep?.placement === "top" ||
      (currentStep?.placement !== "bottom" && !topCandidate && highlightRect.top - CARD_GAP - 220 >= VIEWPORT_PADDING);

    const top = shouldPlaceOnTop
      ? Math.max(VIEWPORT_PADDING, highlightRect.top - CARD_GAP - 220)
      : Math.min(defaultTop, window.innerHeight - 220 - VIEWPORT_PADDING);

    return {
      left,
      top,
      width: preferredWidth,
    };
  }, [currentStep?.placement, highlightRect]);

  if (!open || !currentStep || !cardPosition) return null;

  const resolvedHighlightRect =
    highlightRect ??
    ({
      top: VIEWPORT_PADDING,
      left: VIEWPORT_PADDING,
      right: VIEWPORT_PADDING,
      bottom: VIEWPORT_PADDING,
      width: 0,
      height: 0,
    } satisfies Rect);

  return (
    <div data-testid="spotlight-guide-overlay" className="pointer-events-none fixed inset-0 z-[520]">
      <div
        className="absolute bg-[rgba(5,12,12,0.68)]"
        style={{ top: 0, left: 0, right: 0, height: resolvedHighlightRect.top }}
      />
      <div
        className="absolute bg-[rgba(5,12,12,0.68)]"
        style={{ top: resolvedHighlightRect.top, left: 0, width: resolvedHighlightRect.left, height: resolvedHighlightRect.height }}
      />
      <div
        className="absolute bg-[rgba(5,12,12,0.68)]"
        style={{
          top: resolvedHighlightRect.top,
          left: resolvedHighlightRect.right,
          right: 0,
          height: resolvedHighlightRect.height,
        }}
      />
      <div
        className="absolute bg-[rgba(5,12,12,0.68)]"
        style={{ top: resolvedHighlightRect.bottom, left: 0, right: 0, bottom: 0 }}
      />

      <div
        data-testid="spotlight-guide-highlight"
        className="absolute rounded-[24px] border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0)]"
        style={{
          top: resolvedHighlightRect.top,
          left: resolvedHighlightRect.left,
          width: resolvedHighlightRect.width,
          height: resolvedHighlightRect.height,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0)",
        }}
      />

      <div
        data-testid={`spotlight-guide-target-${currentStep.id}`}
        className="absolute rounded-[24px] border border-white/55 bg-white/8"
        style={{
          top: resolvedHighlightRect.top,
          left: resolvedHighlightRect.left,
          width: resolvedHighlightRect.width,
          height: resolvedHighlightRect.height,
        }}
      />

      <section
        data-testid="spotlight-guide-card"
        className="pointer-events-auto absolute rounded-[24px] border border-white/40 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(238,248,245,0.92))] p-5 text-[#17413f] shadow-[0_24px_48px_rgba(7,21,21,0.28)] backdrop-blur-md"
        style={{
          top: cardPosition.top,
          left: cardPosition.left,
          width: cardPosition.width,
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5f8682]">Tips Guide</p>
        <h2 className="mt-2 text-lg font-semibold leading-6 text-[#10201f]">{currentStep.title}</h2>
        <p className="mt-3 text-sm leading-6 text-[#456765]">{currentStep.description}</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            data-testid="route-guide-skip-button"
            type="button"
            onClick={onSkip}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#83c5be]/55 bg-white px-4 py-2 text-sm font-semibold text-[#17413f] transition hover:bg-[#f7fcfb]"
          >
            Skip
          </button>
          <button
            data-testid="route-guide-next-button"
            type="button"
            onClick={onNext}
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#17413f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f3230]"
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
