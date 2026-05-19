import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import {
  hideLandingSpiderCatGuideForRuntime,
  readLandingSpiderCatGuideRuntimeHiddenState,
} from "./LandingSpiderCatGuide";

const spiderCatGifUrl = new URL("../../assets/landing/cat-spider.gif", import.meta.url).href;

const DEFAULT_TIPS = [
  "You look lost. Map first?",
  "Big plans? 3D Route is over there.",
  "Need the backstory? About us exists.",
  "No destination yet? Wander first.",
  "Still deciding? I crawl. You choose.",
] as const;

const START_SPIDER_CAT_PATROL_POINTS = [
  { x: 28, y: 24 },
  { x: 34, y: 22 },
  { x: 42, y: 26 },
  { x: 52, y: 31 },
  { x: 64, y: 29 },
  { x: 73, y: 34 },
  { x: 78, y: 45 },
  { x: 74, y: 56 },
  { x: 65, y: 63 },
  { x: 53, y: 67 },
  { x: 40, y: 64 },
  { x: 30, y: 58 },
  { x: 24, y: 46 },
  { x: 23, y: 34 },
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function easeInOutCubic(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

type LandingSpiderCatJourneyProps = {
  howToAnchorRef: RefObject<HTMLElement | null>;
  startAnchorRef: RefObject<HTMLElement | null>;
};

export default function LandingSpiderCatJourney({
  howToAnchorRef,
  startAnchorRef,
}: LandingSpiderCatJourneyProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isHidden, setIsHidden] = useState(readLandingSpiderCatGuideRuntimeHiddenState());
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [journeyStage, setJourneyStage] = useState<"hidden" | "how" | "stick" | "start">("hidden");
  const [position, setPosition] = useState({
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
    opacity: 0,
  });
  const [startRoamPosition, setStartRoamPosition] = useState<{ x: number; y: number }>(
    START_SPIDER_CAT_PATROL_POINTS[0]
  );
  const tipIndexRef = useRef(0);
  const patrolIndexRef = useRef(1);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const startRoamPositionRef = useRef(startRoamPosition);
  const stickyPositionRef = useRef<{ x: number; y: number } | null>(null);
  const moveIntervalRef = useRef<number | null>(null);
  const stageTimeoutRef = useRef<number | null>(null);

  const showNextTip = () => {
    const nextTip = DEFAULT_TIPS[tipIndexRef.current % DEFAULT_TIPS.length];
    tipIndexRef.current += 1;
    setActiveTip(nextTip);
  };

  const clearScheduledMotion = () => {
    if (stageTimeoutRef.current !== null) {
      window.clearTimeout(stageTimeoutRef.current);
      stageTimeoutRef.current = null;
    }
    if (moveIntervalRef.current !== null) {
      window.clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
  };

  useEffect(() => {
    startRoamPositionRef.current = startRoamPosition;
  }, [startRoamPosition]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const desktopQuery = window.matchMedia("(pointer: fine)");
    const mobileQuery = window.matchMedia("(max-width: 820px)");
    const syncDesktop = () => {
      setIsDesktop(desktopQuery.matches && !mobileQuery.matches);
    };

    syncDesktop();
    desktopQuery.addEventListener("change", syncDesktop);
    mobileQuery.addEventListener("change", syncDesktop);

    return () => {
      desktopQuery.removeEventListener("change", syncDesktop);
      mobileQuery.removeEventListener("change", syncDesktop);
    };
  }, []);

  useEffect(() => {
    if (!isDesktop || isHidden || isDragging) return;

    const updatePosition = () => {
      const howToAnchor = howToAnchorRef.current;
      const startAnchor = startAnchorRef.current;
      if (!howToAnchor || !startAnchor) return;

      const startScene = startAnchor.closest(".landing-start-scene");
      if (!(startScene instanceof HTMLElement)) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = Math.max(window.innerHeight, 1);
      const howRect = howToAnchor.getBoundingClientRect();
      const startRect = startAnchor.getBoundingClientRect();
      const startSceneRect = startScene.getBoundingClientRect();

      const howAnchorVisibleProgress = clamp01((viewportHeight * 0.92 - howRect.top) / (viewportHeight * 0.26));

      const howBaseX = clamp(howRect.left + howRect.width * 0.76, 84, viewportWidth - 96);
      const howBaseY = clamp(howRect.bottom + Math.min(54, viewportHeight * 0.06), 132, viewportHeight - 132);
      const hoverX = lerp(howBaseX - 8, howBaseX + 10, easeInOutCubic(howAnchorVisibleProgress));
      const hoverY = lerp(howBaseY + 12, howBaseY - 6, easeOutCubic(howAnchorVisibleProgress));

      const shouldHideBeforeHowTo = howRect.top > viewportHeight * 0.88;
      const shouldHideAfterJourney = howRect.bottom < -240 && startRect.bottom < -180;
      const shouldStickBetweenScenes = howRect.bottom <= viewportHeight * 0.2 && startSceneRect.top > viewportHeight * 0.78;
      const shouldRoamInStart = startSceneRect.top <= viewportHeight * 0.78 && startSceneRect.bottom >= 120;

      if (shouldRoamInStart) {
        const stickyPosition = stickyPositionRef.current ?? { x: hoverX, y: hoverY };
        const nextRoamX = clamp((stickyPosition.x / Math.max(viewportWidth, 1)) * 100, 12, 88);
        const nextRoamY = clamp((stickyPosition.y / Math.max(viewportHeight, 1)) * 100, 18, 82);
        const roamSnapshot = startRoamPositionRef.current;
        if (Math.abs(roamSnapshot.x - nextRoamX) > 0.5 || Math.abs(roamSnapshot.y - nextRoamY) > 0.5) {
          const nextRoamPosition = { x: nextRoamX, y: nextRoamY };
          startRoamPositionRef.current = nextRoamPosition;
          setStartRoamPosition(nextRoamPosition);
        }
        setJourneyStage("start");
        const roamX = clamp((startRoamPositionRef.current.x / 100) * viewportWidth, 84, viewportWidth - 96);
        const roamY = clamp((startRoamPositionRef.current.y / 100) * viewportHeight, 132, viewportHeight - 118);
        setPosition({
          x: roamX,
          y: roamY,
          scaleX: 1,
          scaleY: 1,
          rotate: 0,
          opacity: 1,
        });
        return;
      }

      if (shouldHideBeforeHowTo || shouldHideAfterJourney) {
        stickyPositionRef.current = null;
        setJourneyStage("hidden");
        setPosition({
          x: hoverX,
          y: hoverY,
          scaleX: 1,
          scaleY: 1,
          rotate: 0,
          opacity: 0,
        });
        return;
      }

      if (shouldStickBetweenScenes) {
        const stickyPosition = stickyPositionRef.current ?? { x: hoverX, y: hoverY };
        stickyPositionRef.current = stickyPosition;
        setJourneyStage("stick");
        setPosition({
          x: stickyPosition.x,
          y: stickyPosition.y,
          scaleX: 1,
          scaleY: 1,
          rotate: 0,
          opacity: 1,
        });
        return;
      }

      stickyPositionRef.current = { x: hoverX, y: hoverY };
      setJourneyStage("how");
      setPosition({
        x: hoverX,
        y: hoverY,
        scaleX: 1,
        scaleY: 1,
        rotate: 0,
        opacity: howAnchorVisibleProgress > 0.01 ? 1 : 0,
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);

    return () => {
    window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [howToAnchorRef, isDesktop, isDragging, isHidden, startAnchorRef]);

  useEffect(() => {
    if (journeyStage !== "start" || !isDesktop || isHidden || isDragging || isHovering) {
      clearScheduledMotion();
      return;
    }

    const queueNextMove = (delayMs: number) => {
      clearScheduledMotion();
      stageTimeoutRef.current = window.setTimeout(() => {
        const nextPatrolIndex = patrolIndexRef.current % START_SPIDER_CAT_PATROL_POINTS.length;
        const nextPoint = START_SPIDER_CAT_PATROL_POINTS[nextPatrolIndex];
        const startPoint = startRoamPositionRef.current;
        const moveDurationMs = 1380;
        const moveStartedAt = Date.now();

        setActiveTip(null);

        moveIntervalRef.current = window.setInterval(() => {
          const elapsedMs = Date.now() - moveStartedAt;
          const progress = Math.min(1, elapsedMs / moveDurationMs);
          const nextX = startPoint.x + (nextPoint.x - startPoint.x) * progress;
          const nextY = startPoint.y + (nextPoint.y - startPoint.y) * progress;
          const nextPosition = { x: nextX, y: nextY };
          setStartRoamPosition(nextPosition);

          if (progress < 1) return;

          if (moveIntervalRef.current !== null) {
            window.clearInterval(moveIntervalRef.current);
            moveIntervalRef.current = null;
          }

          patrolIndexRef.current += 1;
          const shouldPauseForTip = patrolIndexRef.current % 4 === 0;
          if (shouldPauseForTip) {
            showNextTip();
            stageTimeoutRef.current = window.setTimeout(() => {
              setActiveTip(null);
              queueNextMove(760);
            }, 2300);
            return;
          }

          queueNextMove(220);
        }, 16);
      }, delayMs);
    };

    queueNextMove(180);

    return () => {
      clearScheduledMotion();
    };
  }, [isDesktop, isDragging, isHidden, isHovering, journeyStage]);

  useEffect(() => {
    if (!isDesktop || !isDragging || journeyStage !== "start" || isHidden) return;

    const updateDragPosition = (clientX: number, clientY: number) => {
      const viewportWidth = Math.max(window.innerWidth, 1);
      const viewportHeight = Math.max(window.innerHeight, 1);
      const normalizedX = ((clientX - dragOffsetRef.current.x) / viewportWidth) * 100;
      const normalizedY = ((clientY - dragOffsetRef.current.y) / viewportHeight) * 100;
      const nextX = clamp(normalizedX, 12, 88);
      const nextY = clamp(normalizedY, 18, 82);
      setStartRoamPosition({ x: nextX, y: nextY });
    };

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      updateDragPosition(event.clientX, event.clientY);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDesktop, isDragging, isHidden, journeyStage]);

  if (!isDesktop || isHidden || position.opacity <= 0.01) return null;

  return (
    <div
      className={`landing-spider-cat landing-spider-cat--journey${isDragging ? " is-dragging" : ""}${
        activeTip ? " is-thinking" : ""
      }`}
      data-testid="landing-spider-cat-journey"
      data-journey-stage={journeyStage}
      data-drag-enabled={journeyStage === "start" ? "true" : "false"}
      onMouseEnter={() => {
        setIsHovering(true);
        if (!activeTip) {
          showNextTip();
        }
      }}
      onMouseLeave={() => {
        setIsHovering(false);
        setActiveTip(null);
      }}
      style={
        {
          "--landing-spider-cat-x": `${position.x}px`,
          "--landing-spider-cat-y": `${position.y}px`,
          "--landing-spider-cat-scale-x": String(position.scaleX),
          "--landing-spider-cat-scale-y": String(position.scaleY),
          "--landing-spider-cat-rotate": `${position.rotate}deg`,
          "--landing-spider-cat-opacity": String(position.opacity),
        } as CSSProperties
      }
    >
      {activeTip ? (
        <div className="landing-spider-cat-tip" data-testid="landing-spider-cat-journey-tip" aria-live="polite">
          <div className="landing-spider-cat-tip-copy">{activeTip}</div>
          <button
            type="button"
            className="landing-spider-cat-tip-dismiss"
            data-testid="landing-spider-cat-journey-hide"
            onClick={() => {
              hideLandingSpiderCatGuideForRuntime();
              clearScheduledMotion();
              setIsDragging(false);
              setIsHovering(false);
              setActiveTip(null);
              setIsHidden(true);
            }}
          >
            Hide pet
          </button>
        </div>
      ) : null}
      <button
        type="button"
        className="landing-spider-cat-button"
        aria-label={journeyStage === "start" ? "Drag the spider cat guide" : "Hover over the spider cat guide"}
        onPointerDown={(event) => {
          if (journeyStage !== "start") return;

          clearScheduledMotion();
          const bounds = event.currentTarget.getBoundingClientRect();
          dragOffsetRef.current = {
            x: event.clientX - bounds.left - bounds.width / 2,
            y: event.clientY - bounds.top - bounds.height / 2,
          };
          setActiveTip(null);
          setIsHovering(false);
          setIsDragging(true);
        }}
      >
        <img src={spiderCatGifUrl} alt="" aria-hidden="true" className="landing-spider-cat-image" />
      </button>
    </div>
  );
}
