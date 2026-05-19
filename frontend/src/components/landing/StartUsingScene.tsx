import { createScope, createTimeline, stagger } from "animejs";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useNavigate } from "react-router";
import LandingSpiderCatGuide from "./LandingSpiderCatGuide";
import { LANDING_CHOREO_EASE, LANDING_REVEAL_DURATIONS } from "./landingMotion";

const bGifUrl = new URL("../../assets/B.gif", import.meta.url).href;
const wGifUrl = new URL("../../assets/W.gif", import.meta.url).href;

const SPIDER_CAT_PATROL_POINTS = [
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

function buildMobileCurvePath(side: "left" | "right") {
  if (side === "left") {
    return "M220 2 C 220 16, 228 24, 244 30 C 266 38, 286 42, 304 48 C 318 52, 328 58, 336 70";
  }

  return "M220 2 C 220 16, 228 24, 246 30 C 272 40, 300 42, 322 50 C 338 56, 348 64, 356 76";
}

function renderTitleWords(value: string) {
  return value.split(" ").map((word, index, words) => (
    <span className="landing-start-title-main-word" key={`${word}-${index}`} aria-hidden="true">
      {word}
      {index < words.length - 1 ? "\u00A0" : ""}
    </span>
  ));
}

function AnimatedLandingButton({
  label,
  nextLabel,
  onClick,
}: {
  label: string;
  nextLabel: string;
  onClick: () => void;
}) {
  const renderChars = (value: string, stateClass: string) => (
    <span className={`landing-start-neo-char ${stateClass}`} aria-hidden="true">
      {Array.from(value).map((character, index) => (
        <span
          data-label={character === " " ? "\u00A0" : character}
          style={{ ["--i" as "--i"]: index + 1 }}
          key={`${stateClass}-${character}-${index}`}
        >
          {character === " " ? "\u00A0" : character}
        </span>
      ))}
    </span>
  );

  return (
    <button className="landing-start-neo-button" type="button" onClick={onClick} aria-label={label}>
      <span className="landing-start-neo-bg" aria-hidden="true"></span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 342 208"
        width="342"
        height="208"
        className="landing-start-neo-splash"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeWidth="3"
          d="M54.1054 99.7837C54.1054 99.7837 40.0984 90.7874 26.6893 97.6362C13.2802 104.485 1.5 97.6362 1.5 97.6362"
        ></path>
        <path
          strokeLinecap="round"
          strokeWidth="3"
          d="M285.273 99.7841C285.273 99.7841 299.28 90.7879 312.689 97.6367C326.098 104.486 340.105 95.4893 340.105 95.4893"
        ></path>
        <path
          strokeLinecap="round"
          strokeWidth="3"
          strokeOpacity="0.3"
          d="M281.133 64.9917C281.133 64.9917 287.96 49.8089 302.934 48.2295C317.908 46.6501 319.712 36.5272 319.712 36.5272"
        ></path>
        <path
          strokeLinecap="round"
          strokeWidth="3"
          strokeOpacity="0.3"
          d="M281.133 138.984C281.133 138.984 287.96 154.167 302.934 155.746C317.908 157.326 319.712 167.449 319.712 167.449"
        ></path>
        <path
          strokeLinecap="round"
          strokeWidth="3"
          d="M230.578 57.4476C230.578 57.4476 225.785 41.5051 236.061 30.4998C246.337 19.4945 244.686 12.9998 244.686 12.9998"
        ></path>
        <path
          strokeLinecap="round"
          strokeWidth="3"
          d="M230.578 150.528C230.578 150.528 225.785 166.471 236.061 177.476C246.337 188.481 244.686 194.976 244.686 194.976"
        ></path>
        <path
          strokeLinecap="round"
          strokeWidth="3"
          strokeOpacity="0.3"
          d="M170.392 57.0278C170.392 57.0278 173.89 42.1322 169.571 29.54C165.252 16.9478 168.751 2.05227 168.751 2.05227"
        ></path>
        <path
          strokeLinecap="round"
          strokeWidth="3"
          strokeOpacity="0.3"
          d="M170.392 150.948C170.392 150.948 173.89 165.844 169.571 178.436C165.252 191.028 168.751 205.924 168.751 205.924"
        ></path>
        <path
          strokeLinecap="round"
          strokeWidth="3"
          d="M112.609 57.4476C112.609 57.4476 117.401 41.5051 107.125 30.4998C96.8492 19.4945 98.5 12.9998 98.5 12.9998"
        ></path>
        <path
          strokeLinecap="round"
          strokeWidth="3"
          d="M112.609 150.528C112.609 150.528 117.401 166.471 107.125 177.476C96.8492 188.481 98.5 194.976 98.5 194.976"
        ></path>
        <path
          strokeLinecap="round"
          strokeWidth="3"
          strokeOpacity="0.3"
          d="M62.2941 64.9917C62.2941 64.9917 55.4671 49.8089 40.4932 48.2295C25.5194 46.6501 23.7159 36.5272 23.7159 36.5272"
        ></path>
        <path
          strokeLinecap="round"
          strokeWidth="3"
          strokeOpacity="0.3"
          d="M62.2941 145.984C62.2941 145.984 55.4671 161.167 40.4932 162.746C25.5194 164.326 23.7159 174.449 23.7159 174.449"
        ></path>
      </svg>

      <span className="landing-start-neo-wrap">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 221 42"
          width="221"
          height="42"
          className="landing-start-neo-path"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeWidth="3"
            d="M182.674 2H203C211.837 2 219 9.16344 219 18V24C219 32.8366 211.837 40 203 40H18C9.16345 40 2 32.8366 2 24V18C2 9.16344 9.16344 2 18 2H47.8855"
          ></path>
        </svg>

        <span className="landing-start-neo-outline" aria-hidden="true"></span>
        <span className="landing-start-neo-content">
          {renderChars(label, "state-1")}
          <span className="landing-start-neo-icon" aria-hidden="true">
            <span></span>
          </span>
          {renderChars(nextLabel, "state-2")}
        </span>
      </span>
    </button>
  );
}

type StartUsingSceneProps = {
  sectionRef?: RefObject<HTMLElement | null>;
  spiderJourneyAnchorRef?: RefObject<HTMLDivElement | null>;
  showSpiderCatGuide?: boolean;
};

export default function StartUsingScene({
  sectionRef,
  spiderJourneyAnchorRef,
  showSpiderCatGuide = true,
}: StartUsingSceneProps) {
  const navigate = useNavigate();
  const sceneRef = useRef<HTMLElement | null>(null);
  const titleShellRef = useRef<HTMLDivElement | null>(null);
  const isSceneInViewRef = useRef(false);
  const [isTitleRevealed, setIsTitleRevealed] = useState(false);
  const [isChoreoActive, setIsChoreoActive] = useState(false);
  const [choreoSeq, setChoreoSeq] = useState(0);
  const openMap = () => navigate("/map");
  const open3DRoute = () => navigate("/map/3d-route");
  const actions = [
    {
      label: "Map",
      nextLabel: "Open",
      description: "Compare comfort, adjust preferences, and find support places nearby.",
      onClick: openMap,
    },
    {
      label: "3D Route",
      nextLabel: "Go",
      description: "Preview your route in 3D and rehearse the trip before you go.",
      onClick: open3DRoute,
    },
  ];
  const gifStrip = Array.from({ length: 8 }, (_, index) => ({
    src: index % 2 === 0 ? bGifUrl : wGifUrl,
    key: `gif-${index}`,
  }));
  const marqueeItems = [...gifStrip, ...gifStrip];

  useEffect(() => {
    const node = sceneRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      isSceneInViewRef.current = true;
      setIsTitleRevealed(true);
      setIsChoreoActive(true);
      setChoreoSeq(1);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry) return;

        if (entry.isIntersecting && !isSceneInViewRef.current) {
          isSceneInViewRef.current = true;
          setIsTitleRevealed(true);
          setIsChoreoActive(true);
          setChoreoSeq((current) => current + 1);
          return;
        }

        if (!entry.isIntersecting && isSceneInViewRef.current) {
          isSceneInViewRef.current = false;
          setIsTitleRevealed(false);
          setIsChoreoActive(false);
        }
      },
      {
        threshold: 0.38,
        rootMargin: "-4% 0px -8% 0px",
      }
    );

    observer.observe(node);

    return () => {
      isSceneInViewRef.current = false;
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const root = sceneRef.current;
    if (!root || !isChoreoActive || choreoSeq === 0) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      return;
    }

    const scope = createScope({ root }).add(() => {
      const titleTag = root.querySelector<HTMLElement>(".landing-start-title-tag");
      const titleWords = Array.from(root.querySelectorAll<HTMLElement>(".landing-start-title-main-word"));
      const titleEcho = root.querySelector<HTMLElement>(".landing-start-title-echo");
      const buttonShells = Array.from(root.querySelectorAll<HTMLElement>(".landing-start-action-button-shell"));
      const curveLines = Array.from(root.querySelectorAll<SVGPathElement>(".landing-start-action-curve-line"));
      const noteCopies = Array.from(root.querySelectorAll<HTMLElement>(".landing-start-action-copy"));
      const curveGlows = Array.from(root.querySelectorAll<SVGCircleElement>(".landing-start-action-curve-glow"));

      curveLines.forEach((line) => {
        if (typeof line.getTotalLength !== "function") return;
        const length = line.getTotalLength();
        line.style.strokeDasharray = `${length}`;
        line.style.strokeDashoffset = `${length}`;
      });

      const timeline = createTimeline({
        defaults: {
          duration: LANDING_REVEAL_DURATIONS.base,
          ease: LANDING_CHOREO_EASE,
        },
      });

      if (titleTag) {
        timeline.add(titleTag, {
          opacity: [0, 1],
          y: ["18px", "0px"],
          scale: [0.96, 1],
          filter: ["blur(10px)", "blur(0px)"],
          duration: LANDING_REVEAL_DURATIONS.quick,
        });
      }

      if (titleWords.length > 0) {
        timeline.add(
          titleWords,
          {
            opacity: [0, 1],
            y: ["1.15em", "0em"],
            rotate: ["4deg", "0deg"],
            filter: ["blur(14px)", "blur(0px)"],
            delay: stagger(70),
            duration: LANDING_REVEAL_DURATIONS.base - 60,
          },
          "-=140"
        );
      }

      if (titleEcho) {
        timeline.add(
          titleEcho,
          {
            opacity: [0, 1],
            x: ["28px", "0px"],
            y: ["12px", "0px"],
            scale: [0.985, 1],
            filter: ["blur(18px)", "blur(0px)"],
            duration: LANDING_REVEAL_DURATIONS.base + 40,
          },
          "-=420"
        );
      }

      if (buttonShells.length > 0) {
        timeline.add(
          buttonShells,
          {
            opacity: [0, 1],
            x: (_target: Element, index: number) => (index === 0 ? ["-18px", "0px"] : ["18px", "0px"]),
            y: ["16px", "0px"],
            scale: [0.94, 1],
            delay: stagger(140, { start: 40 }),
            duration: LANDING_REVEAL_DURATIONS.base,
          },
          "-=220"
        );
      }

      if (curveLines.length > 0) {
        timeline.add(
          curveLines,
          {
            opacity: [0.08, 0.94],
            strokeDashoffset: 0,
            delay: stagger(120),
            duration: LANDING_REVEAL_DURATIONS.slow,
            ease: "inOut(3)",
          },
          "-=620"
        );
      }

      if (curveGlows.length > 0) {
        timeline.add(
          curveGlows,
          {
            opacity: [0.08, 1],
            scale: [0.55, 1],
            delay: stagger(120, { start: 60 }),
            duration: LANDING_REVEAL_DURATIONS.linger,
          },
          "<"
        );
      }

      if (noteCopies.length > 0) {
        timeline.add(
          noteCopies,
          {
            opacity: [0, 1],
            y: ["18px", "0px"],
            scale: [0.94, 1],
            delay: stagger(110, { start: 80 }),
            duration: LANDING_REVEAL_DURATIONS.quick + 140,
          },
          "-=740"
        );
      }
    });

    return () => {
      scope.revert();
    };
  }, [choreoSeq, isChoreoActive]);

  return (
    <section
      ref={(node) => {
        sceneRef.current = node;
        if (sectionRef) {
          sectionRef.current = node;
        }
      }}
      className={`landing-start-scene${isTitleRevealed ? " is-title-revealed" : ""}${
        isChoreoActive ? " is-choreo-active" : ""
      }`}
      data-landing-motion="signature"
      data-choreo-seq={choreoSeq}
      aria-label="Start using EaseMove"
    >
      {showSpiderCatGuide ? (
        <LandingSpiderCatGuide sceneRef={sceneRef} patrolPoints={SPIDER_CAT_PATROL_POINTS} />
      ) : null}
      <div className="landing-start-inner">
        <div
          ref={(node) => {
            titleShellRef.current = node;
            if (spiderJourneyAnchorRef) {
              spiderJourneyAnchorRef.current = node;
            }
          }}
          className="landing-start-title-shell"
        >
          <p className="landing-start-title-tag">Choose your next step</p>
          <h2 className="landing-start-title">
            <span className="landing-start-title-main back-in-left" aria-label="Pick your path">
              {renderTitleWords("Pick your path")}
            </span>
            <span className="landing-start-title-echo back-in-right" data-text="MoveComfortly">
              MoveComfortly
            </span>
          </h2>
        </div>
        <div className="landing-start-actions">
          {actions.map((action, index) => (
            <div
              className={`landing-start-action-card landing-start-action-card-${
                index === 0 ? "left" : "right"
              }`}
              key={action.label}
            >
              <div className="landing-start-action-card-stack">
                <div className="landing-start-action-button-shell">
                  <AnimatedLandingButton
                    key={`${action.label}-${choreoSeq}`}
                    label={action.label}
                    nextLabel={action.nextLabel}
                    onClick={action.onClick}
                  />
                </div>
                <div className={`landing-start-action-note landing-start-action-note-${index === 0 ? "left" : "right"}`}>
                  {(() => {
                    const side = index === 0 ? "left" : "right";
                    const mobilePath = buildMobileCurvePath(side);

                    return (
                  <svg
                    className={`landing-start-action-curve landing-start-action-curve-${
                      index === 0 ? "left" : "right"
                    }`}
                    viewBox="0 0 440 168"
                    aria-hidden="true"
                    preserveAspectRatio="none"
                  >
                    <path
                      className="landing-start-action-curve-line landing-start-action-curve-line-desktop"
                      d={
                        index === 0
                          ? "M220 12 C 220 42, 212 64, 190 82 C 156 110, 106 104, 72 128 C 46 146, 22 154, -12 142"
                          : "M220 12 C 220 42, 228 64, 250 82 C 284 110, 334 104, 368 128 C 394 146, 418 154, 452 142"
                      }
                    />
                    <path
                      className="landing-start-action-curve-line landing-start-action-curve-line-mobile"
                      d={mobilePath}
                    />
                    <circle className="landing-start-action-curve-glow landing-start-action-curve-glow-desktop" r="4.5">
                      <animateMotion
                        dur={index === 0 ? "6.4s" : "6.9s"}
                        repeatCount="indefinite"
                        rotate="auto"
                        path={
                          index === 0
                            ? "M220 12 C 220 42, 212 64, 190 82 C 156 110, 106 104, 72 128 C 46 146, 22 154, -12 142"
                            : "M220 12 C 220 42, 228 64, 250 82 C 284 110, 334 104, 368 128 C 394 146, 418 154, 452 142"
                        }
                      />
                    </circle>
                    <circle className="landing-start-action-curve-glow landing-start-action-curve-glow-mobile" r="4.5">
                      <animateMotion
                        dur={index === 0 ? "4.8s" : "5.1s"}
                        repeatCount="indefinite"
                        rotate="auto"
                        path={mobilePath}
                      />
                    </circle>
                  </svg>
                    );
                  })()}
                  <p className="landing-start-action-copy">{action.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="landing-gif-marquee" aria-hidden="true">
          <div className="landing-gif-marquee-track">
            {marqueeItems.map(({ src, key }, index) => (
              <div className="landing-gif-marquee-item" key={`${key}-${index}`}>
                <img src={src} alt="" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
