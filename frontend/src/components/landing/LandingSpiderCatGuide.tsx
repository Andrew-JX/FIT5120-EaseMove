import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";

const spiderCatGifUrl = new URL("../../assets/landing/cat-spider.gif", import.meta.url).href;

const DEFAULT_TIPS = [
  "You look lost. Map first?",
  "Big plans? 3D Route is over there.",
  "Need the backstory? About us exists.",
  "No destination yet? Wander first.",
  "Still deciding? I crawl. You choose.",
] as const;

let isLandingSpiderCatHiddenForRuntime = false;

export function resetLandingSpiderCatGuideRuntimeState() {
  isLandingSpiderCatHiddenForRuntime = false;
}

export function hideLandingSpiderCatGuideForRuntime() {
  isLandingSpiderCatHiddenForRuntime = true;
}

export function readLandingSpiderCatGuideRuntimeHiddenState() {
  return isLandingSpiderCatHiddenForRuntime;
}

type PatrolPoint = {
  x: number;
  y: number;
};

type LandingSpiderCatGuideProps = {
  sceneRef: RefObject<HTMLElement | null>;
  patrolPoints: readonly PatrolPoint[];
  tips?: readonly string[];
  testIdPrefix?: string;
};

export default function LandingSpiderCatGuide({
  sceneRef,
  patrolPoints,
  tips = DEFAULT_TIPS,
  testIdPrefix = "landing-spider-cat",
}: LandingSpiderCatGuideProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isHidden, setIsHidden] = useState(readLandingSpiderCatGuideRuntimeHiddenState());
  const [position, setPosition] = useState({ x: patrolPoints[0]?.x ?? 28, y: patrolPoints[0]?.y ?? 24 });
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [spiderState, setSpiderState] = useState<"moving" | "thinking" | "dragging">("moving");
  const patrolIndexRef = useRef(1);
  const tipIndexRef = useRef(0);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef(position);
  const stageTimeoutRef = useRef<number | null>(null);
  const moveIntervalRef = useRef<number | null>(null);

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

  const showNextTip = () => {
    const nextTip = tips[tipIndexRef.current % tips.length];
    tipIndexRef.current += 1;
    setSpiderState("thinking");
    setActiveTip(nextTip);
  };

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

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
    if (isHidden) {
      clearScheduledMotion();
    }
  }, [isHidden]);

  useEffect(() => {
    if (!isDesktop || isDragging || isHovering || isHidden) return;

    const queueNextMove = (delayMs: number) => {
      clearScheduledMotion();
      stageTimeoutRef.current = window.setTimeout(() => {
        const nextPatrolIndex = patrolIndexRef.current % patrolPoints.length;
        const nextPoint = patrolPoints[nextPatrolIndex];
        const startPoint = positionRef.current;
        const moveDurationMs = 1380;
        const moveStartedAt = Date.now();

        setSpiderState("moving");
        setActiveTip(null);

        moveIntervalRef.current = window.setInterval(() => {
          const elapsedMs = Date.now() - moveStartedAt;
          const progress = Math.min(1, elapsedMs / moveDurationMs);
          const nextX = startPoint.x + (nextPoint.x - startPoint.x) * progress;
          const nextY = startPoint.y + (nextPoint.y - startPoint.y) * progress;
          const nextPosition = { x: nextX, y: nextY };
          positionRef.current = nextPosition;
          setPosition(nextPosition);

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
  }, [isDesktop, isDragging, isHidden, isHovering, patrolPoints]);

  useEffect(() => {
    if (!isDesktop || !isDragging || isHidden) return;

    const updateDragPosition = (clientX: number, clientY: number) => {
      const scene = sceneRef.current;
      if (!scene) return;
      const rect = scene.getBoundingClientRect();
      const normalizedX = ((clientX - rect.left - dragOffsetRef.current.x) / rect.width) * 100;
      const normalizedY = ((clientY - rect.top - dragOffsetRef.current.y) / rect.height) * 100;
      const nextX = Math.max(12, Math.min(88, normalizedX));
      const nextY = Math.max(18, Math.min(82, normalizedY));
      setPosition({ x: nextX, y: nextY });
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
  }, [isDesktop, isDragging, isHidden, sceneRef]);

  useEffect(() => {
    if (!isDesktop || isDragging || isHidden) return;

    if (isHovering) {
      clearScheduledMotion();
      if (!activeTip || spiderState !== "thinking") {
        showNextTip();
      }
    }
  }, [activeTip, isDesktop, isDragging, isHidden, isHovering, spiderState]);

  if (!isDesktop || isHidden) return null;

  return (
    <div
      className={`landing-spider-cat${isDragging ? " is-dragging" : ""}${activeTip ? " is-thinking" : ""}`}
      data-testid={testIdPrefix}
      data-spider-state={isDragging ? "dragging" : spiderState}
      onMouseEnter={() => {
        if (!isDragging) {
          setIsHovering(true);
        }
      }}
      onMouseLeave={() => {
        setActiveTip(null);
        setSpiderState("moving");
        setIsHovering(false);
      }}
      style={
        {
          "--landing-spider-cat-x": `${position.x}%`,
          "--landing-spider-cat-y": `${position.y}%`,
        } as CSSProperties
      }
    >
      {activeTip ? (
        <div className="landing-spider-cat-tip" data-testid={`${testIdPrefix}-tip`} aria-live="polite">
          <div className="landing-spider-cat-tip-copy">{activeTip}</div>
          <button
            type="button"
            className="landing-spider-cat-tip-dismiss"
            data-testid={`${testIdPrefix}-hide`}
            onClick={() => {
              hideLandingSpiderCatGuideForRuntime();
              clearScheduledMotion();
              setActiveTip(null);
              setIsHovering(false);
              setIsDragging(false);
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
        aria-label="Drag the spider cat guide"
        onPointerDown={(event) => {
          clearScheduledMotion();
          const bounds = event.currentTarget.getBoundingClientRect();
          dragOffsetRef.current = {
            x: event.clientX - bounds.left - bounds.width / 2,
            y: event.clientY - bounds.top - bounds.height / 2,
          };
          setActiveTip(null);
          setIsHovering(false);
          setSpiderState("dragging");
          setIsDragging(true);
        }}
      >
        <img src={spiderCatGifUrl} alt="" aria-hidden="true" className="landing-spider-cat-image" />
      </button>
    </div>
  );
}
