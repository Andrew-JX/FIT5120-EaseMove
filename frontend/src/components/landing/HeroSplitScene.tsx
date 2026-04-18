import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import IconMarquee from "./IconMarquee";

const melVideoUrl = new URL("../../assets/landing/Mel.mp4", import.meta.url).href;
const WHEEL_PROGRESS_FACTOR = 0.001;
const TOUCH_PROGRESS_FACTOR = 0.003;
const KEY_PROGRESS_STEP = 0.1;
const MAX_INPUT_STEP = 0.08;
const COMPLETION_THRESHOLD = 0.995;

function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value));
}

function clampInputStep(value: number) {
  return Math.min(MAX_INPUT_STEP, Math.max(-MAX_INPUT_STEP, value));
}

export default function HeroSplitScene() {
  const [canPlayVideo, setCanPlayVideo] = useState(true);
  const [completed, setCompleted] = useState(false);
  const targetProgress = useMotionValue(0);
  const smoothedProgress = useSpring(targetProgress, {
    stiffness: 115,
    damping: 26,
    mass: 0.9,
  });
  const touchYRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    completedRef.current = completed;
  }, [completed]);

  useEffect(() => {
    const unsubscribe = smoothedProgress.on("change", (latest) => {
      if (completedRef.current || latest < COMPLETION_THRESHOLD) return;

      completedRef.current = true;
      setCompleted(true);
    });

    return unsubscribe;
  }, [smoothedProgress]);

  useEffect(() => {
    const isHomePath = window.location.pathname === "/";
    if (!isHomePath || completed) return;

    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    root.style.overflow = "hidden";
    body.style.overflow = "hidden";

    const updateProgress = (delta: number) => {
      if (completedRef.current) return;

      const nextProgress = clampProgress(targetProgress.get() + delta);
      targetProgress.set(nextProgress);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      updateProgress(clampInputStep(event.deltaY * WHEEL_PROGRESS_FACTOR));
    };

    const handleTouchStart = (event: TouchEvent) => {
      touchYRef.current = event.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      const currentY = event.touches[0]?.clientY;
      if (currentY === undefined || touchYRef.current === null) return;

      const deltaY = touchYRef.current - currentY;
      touchYRef.current = currentY;
      updateProgress(clampInputStep(deltaY * TOUCH_PROGRESS_FACTOR));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      const isReverse = key === "ArrowUp" || key === "PageUp" || key === "Home";
      const isForward =
        key === "ArrowDown" ||
        key === "PageDown" ||
        key === " " ||
        key === "Spacebar" ||
        key === "End";

      if (!isForward && !isReverse) return;

      event.preventDefault();

      if (key === "End") {
        updateProgress(1);
        return;
      }

      if (key === "Home") {
        targetProgress.set(0);
        return;
      }

      const direction = isReverse || (event.shiftKey && (key === " " || key === "Spacebar")) ? -1 : 1;
      updateProgress(direction * KEY_PROGRESS_STEP);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("keydown", handleKeyDown);
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
      touchYRef.current = null;
    };
  }, [completed, targetProgress]);

  const videoWidth = useTransform(smoothedProgress, [0.2, 0.65], ["100vw", "42vw"]);
  const videoHeight = useTransform(smoothedProgress, [0.2, 0.65], ["100vh", "58vh"]);
  const videoX = useTransform(smoothedProgress, [0.2, 0.65], ["-50%", "-78%"]);
  const videoRadius = useTransform(smoothedProgress, [0.2, 0.65], ["0px", "8px"]);
  const videoShadow = useTransform(
    smoothedProgress,
    [0.2, 0.65],
    ["0 0 0 rgba(0,0,0,0)", "0 28px 70px rgba(0,0,0,0.34)"],
  );

  const heroLabelOpacity = useTransform(smoothedProgress, [0, 0.2, 0.42], [1, 0.9, 0]);
  const heroLabelY = useTransform(smoothedProgress, [0, 0.42], ["0px", "22px"]);

  const copyOpacity = useTransform(smoothedProgress, [0.24, 0.48, 0.65], [0, 0.88, 1]);
  const copyX = useTransform(smoothedProgress, [0.24, 0.65], ["44px", "0px"]);
  const copyY = useTransform(smoothedProgress, [0.24, 0.65], ["18px", "0px"]);

  const marqueeOpacity = useTransform(smoothedProgress, [0.28, 0.55, 0.72], [0, 0.82, 1]);
  const marqueeY = useTransform(smoothedProgress, [0.28, 0.72], ["24px", "0px"]);

  return (
    <section className="landing-hero-scene">
      <div className="landing-hero-sticky">
        <div className="landing-hero-backdrop" />

        <motion.div
          className="landing-video-frame"
          style={{
            width: videoWidth,
            height: videoHeight,
            x: videoX,
            y: "-50%",
            borderRadius: videoRadius,
            boxShadow: videoShadow,
          }}
        >
          {canPlayVideo ? (
            <video
              className="landing-video"
              src={melVideoUrl}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              onError={() => setCanPlayVideo(false)}
            />
          ) : (
            <div className="landing-video-placeholder">
              <span>Melbourne in motion</span>
            </div>
          )}
          <div className="landing-video-scrim" />
        </motion.div>

        <motion.div
          className="landing-brand"
          style={{ opacity: heroLabelOpacity, x: "-50%", y: heroLabelY }}
          aria-hidden="true"
        >
          EaseMove
        </motion.div>

        <motion.p
          className="landing-hero-caption"
          style={{ opacity: heroLabelOpacity, y: heroLabelY }}
        >
          EaseMove of Melbourne
        </motion.p>

        <div className="landing-compose-grid">
          <motion.div
            className="landing-copy-panel"
            style={{ opacity: copyOpacity, x: copyX, y: copyY }}
          >
            <h1>Helping young Melburnians move through their city, comfortably.</h1>
            <p>
              EaseMove Melbourne combines real-time microclimate conditions and activity
              patterns to help young walkers and cyclists compare precincts, personalise
              comfort priorities, and choose better travel times.
            </p>
            <motion.div
              className="landing-marquee-wrap"
              style={{ opacity: marqueeOpacity, y: marqueeY }}
            >
              <IconMarquee />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
