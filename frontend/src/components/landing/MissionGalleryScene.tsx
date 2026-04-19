import { useEffect, useRef, useState } from "react";
import { motion, MotionValue, useMotionValue, useSpring, useTransform } from "framer-motion";

const TEXT_ENTER_END = 0.18;
const IMAGE_SEQUENCE_START = 0.32;
const SPREAD_START = 0.8;
const SPREAD_END = 0.92;

const galleryImages = [
  {
    src: new URL("../../assets/landing/1.png", import.meta.url).href,
    alt: "A Melbourne street scene for planning easier movement",
    start: IMAGE_SEQUENCE_START,
    end: 0.44,
    stackY: "0px",
    stackRotate: 7,
    finalXDirection: -1,
    finalYDirection: -1,
    finalRotate: 0.8,
  },
  {
    src: new URL("../../assets/landing/2.png", import.meta.url).href,
    alt: "A city detail showing everyday movement conditions",
    start: 0.44,
    end: 0.56,
    stackY: "-10px",
    stackRotate: -6,
    finalXDirection: 1,
    finalYDirection: -1,
    finalRotate: -0.6,
  },
  {
    src: new URL("../../assets/landing/3.png", import.meta.url).href,
    alt: "A Melbourne route moment shaped by weather and activity",
    start: 0.56,
    end: 0.68,
    stackY: "-20px",
    stackRotate: 5,
    finalXDirection: -1,
    finalYDirection: 1,
    finalRotate: -0.8,
  },
  {
    src: new URL("../../assets/landing/4.png", import.meta.url).href,
    alt: "A city movement snapshot for comfortable travel choices",
    start: 0.68,
    end: 0.8,
    stackY: "-30px",
    stackRotate: -4,
    finalXDirection: 1,
    finalYDirection: 1,
    finalRotate: 0.7,
  },
];

const missionCopy = "Move through Melbourne with comfort, confidence, and better timing.";
const CARD_ENTRY_BUFFER = 48;
const CARD_DESKTOP_WIDTH = { min: 170, ratio: 0.22, max: 315 };
const CARD_DESKTOP_HEIGHT = { min: 124, ratio: 0.158, max: 226 };
const CARD_MOBILE_WIDTH = { min: 128, ratio: 0.38, max: 178 };
const CARD_MOBILE_HEIGHT = { min: 96, ratio: 0.29, max: 134 };
const MISSION_SAFE_RADIUS_X = 330;
const MISSION_SAFE_RADIUS_Y = 185;
const MISSION_SAFE_RADIUS_X_MOBILE = 165;
const MISSION_SAFE_RADIUS_Y_MOBILE = 145;
const SPRING_CONFIG = {
  stiffness: 118,
  damping: 27,
  mass: 0.9,
};

function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value));
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getClampedViewportSize(width: number, config: { min: number; ratio: number; max: number }) {
  return clampNumber(width * config.ratio, config.min, config.max);
}

function getSeededCharacterDelay(index: number) {
  const seeded = (index * 37 + index * index * 11 + 17) % 100;
  return 0.01 + (seeded / 100) * 0.09;
}

function getLayoutMetrics() {
  if (typeof window === "undefined") {
    return {
      cardWidth: CARD_DESKTOP_WIDTH.max,
      cardHeight: CARD_DESKTOP_HEIGHT.max,
      entryStartY: 540,
      spreadX: 430,
      spreadY: 300,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const isMobile = width <= 820;
  const cardWidth = getClampedViewportSize(width, isMobile ? CARD_MOBILE_WIDTH : CARD_DESKTOP_WIDTH);
  const cardHeight = getClampedViewportSize(width, isMobile ? CARD_MOBILE_HEIGHT : CARD_DESKTOP_HEIGHT);
  const safeRadiusX = isMobile ? MISSION_SAFE_RADIUS_X_MOBILE : MISSION_SAFE_RADIUS_X;
  const safeRadiusY = isMobile ? MISSION_SAFE_RADIUS_Y_MOBILE : MISSION_SAFE_RADIUS_Y;
  const maxX = Math.max(safeRadiusX + cardWidth / 2 + 18, width / 2 - cardWidth / 2 - 26);
  const maxY = Math.max(safeRadiusY + cardHeight / 2 + 18, height / 2 - cardHeight / 2 - 26);

  return {
    cardWidth,
    cardHeight,
    entryStartY: height / 2 + cardHeight / 2 + CARD_ENTRY_BUFFER,
    spreadX: clampNumber(safeRadiusX + cardWidth / 2 + 58, safeRadiusX + cardWidth / 2 + 18, maxX),
    spreadY: clampNumber(safeRadiusY + cardHeight / 2 + 48, safeRadiusY + cardHeight / 2 + 18, maxY),
  };
}

function MissionCharacter({
  character,
  index,
  progress,
}: {
  character: string;
  index: number;
  progress: MotionValue<number>;
}) {
  const delay = getSeededCharacterDelay(index);
  const revealEnd = Math.min(TEXT_ENTER_END, delay + 0.08);
  const opacity = useTransform(progress, [0, delay, revealEnd, 1], [0, 0, 1, 1]);
  const y = useTransform(progress, [0, delay, revealEnd, 1], ["18px", "18px", "0px", "0px"]);

  return (
    <motion.span className="landing-mission-copy-character" style={{ opacity, y }}>
      {character === " " ? "\u00A0" : character}
    </motion.span>
  );
}

function MissionText({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0, 0.04, TEXT_ENTER_END, 0.32, SPREAD_START, SPREAD_END, 1], [
    0,
    0.45,
    1,
    1,
    0.04,
    1,
    1,
  ]);
  const y = useTransform(progress, [0, TEXT_ENTER_END, 1], ["44px", "0px", "0px"]);
  const scale = useTransform(progress, [0, TEXT_ENTER_END, 1], [0.96, 1, 1]);

  let characterIndex = 0;

  return (
    <motion.div className="landing-mission-text-inner" style={{ opacity, y, scale }}>
      <p className="landing-mission-copy">
        {missionCopy.split(" ").map((word, wordIndex, words) => (
          <span className="landing-mission-copy-word" key={`${word}-${wordIndex}`}>
            {word.split("").map((character) => {
              const index = characterIndex;
              characterIndex += 1;

              return (
                <MissionCharacter
                  character={character}
                  index={index}
                  progress={progress}
                  key={`${character}-${index}`}
                />
              );
            })}
            {wordIndex < words.length - 1 ? (
              <MissionCharacter character=" " index={characterIndex++} progress={progress} />
            ) : null}
          </span>
        ))}
      </p>
    </motion.div>
  );
}

function GalleryImage({
  image,
  index,
  progress,
  layout,
}: {
  image: (typeof galleryImages)[number];
  index: number;
  progress: MotionValue<number>;
  layout: ReturnType<typeof getLayoutMetrics>;
}) {
  const x = useTransform(progress, [0, image.end, SPREAD_START, SPREAD_END, 1], [
    "0px",
    "0px",
    "0px",
    `${image.finalXDirection * layout.spreadX}px`,
    `${image.finalXDirection * layout.spreadX}px`,
  ]);
  const y = useTransform(progress, [0, image.start, image.end, SPREAD_START, SPREAD_END, 1], [
    `${layout.entryStartY}px`,
    `${layout.entryStartY}px`,
    image.stackY,
    image.stackY,
    `${image.finalYDirection * layout.spreadY}px`,
    `${image.finalYDirection * layout.spreadY}px`,
  ]);
  const rotate = useTransform(progress, [0, image.end, SPREAD_START, SPREAD_END, 1], [
    image.stackRotate,
    image.stackRotate,
    image.stackRotate,
    image.finalRotate,
    image.finalRotate,
  ]);
  const opacity = useTransform(progress, [0, image.start, image.start + 0.025, 1], [0, 0, 1, 1]);
  const scale = useTransform(progress, [0, image.start, image.end, 1], [0.96, 0.96, 1, 1]);

  return (
    <motion.figure
      className="landing-mission-gallery-card"
      style={{ x, y, rotate, opacity, scale, zIndex: 10 + index }}
    >
      <img src={image.src} alt={image.alt} draggable="false" />
    </motion.figure>
  );
}

function GalleryStack({
  progress,
  layout,
}: {
  progress: MotionValue<number>;
  layout: ReturnType<typeof getLayoutMetrics>;
}) {
  return (
    <div className="landing-mission-gallery-stage" aria-hidden="true">
      {galleryImages.map((image, index) => (
        <GalleryImage image={image} index={index} progress={progress} layout={layout} key={image.src} />
      ))}
    </div>
  );
}

function MissionComposition({
  progress,
  layout,
}: {
  progress: MotionValue<number>;
  layout: ReturnType<typeof getLayoutMetrics>;
}) {
  return (
    <div className="landing-mission-composition">
      <div className="landing-mission-flow-anchor">
        <MissionText progress={progress} />
      </div>
      <GalleryStack progress={progress} layout={layout} />
    </div>
  );
}

export default function MissionGalleryScene() {
  const [layout, setLayout] = useState(() => getLayoutMetrics());
  const [frameActive, setFrameActive] = useState(false);
  const sceneRef = useRef<HTMLElement | null>(null);
  const frameActiveRef = useRef(false);
  const targetProgress = useMotionValue(0);
  const smoothedProgress = useSpring(targetProgress, SPRING_CONFIG);

  const setFrameActiveIfChanged = (nextActive: boolean) => {
    if (frameActiveRef.current === nextActive) return;

    frameActiveRef.current = nextActive;
    setFrameActive(nextActive);
  };

  useEffect(() => {
    let frame = 0;

    const updateProgress = () => {
      frame = 0;
      const node = sceneRef.current;
      if (!node) return;

      const sectionStart = node.offsetTop;
      const sectionEnd = sectionStart + node.offsetHeight - window.innerHeight;
      const travel = Math.max(1, sectionEnd - sectionStart);
      const scrollY = window.scrollY;

      setFrameActiveIfChanged(scrollY >= sectionStart && scrollY <= sectionEnd);
      targetProgress.set(clampProgress((scrollY - sectionStart) / travel));
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", requestUpdate, { passive: true });

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", requestUpdate);
    };
  }, [targetProgress]);

  useEffect(() => {
    let frame = 0;

    const updateLayout = () => {
      frame = 0;
      setLayout(getLayoutMetrics());

      const node = sceneRef.current;
      if (!node) return;

      const sectionStart = node.offsetTop;
      const sectionEnd = sectionStart + node.offsetHeight - window.innerHeight;
      const travel = Math.max(1, sectionEnd - sectionStart);
      const scrollY = window.scrollY;

      setFrameActiveIfChanged(scrollY >= sectionStart && scrollY <= sectionEnd);
      targetProgress.set(clampProgress((scrollY - sectionStart) / travel));
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateLayout);
    };

    updateLayout();
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("resize", requestUpdate);
    };
  }, [targetProgress]);

  return (
    <section
      className="landing-mission-scene"
      ref={sceneRef}
      aria-label="EaseMove mission gallery"
    >
      {frameActive ? (
        <div className="landing-mission-fixed-frame">
          <MissionComposition progress={smoothedProgress} layout={layout} />
        </div>
      ) : null}
    </section>
  );
}
