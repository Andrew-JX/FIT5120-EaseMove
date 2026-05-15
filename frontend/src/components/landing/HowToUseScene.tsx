import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

const screenshotUrls = [
  new URL("../../assets/landing/5.png", import.meta.url).href,
  new URL("../../assets/landing/6.png", import.meta.url).href,
  new URL("../../assets/landing/7.png", import.meta.url).href,
  new URL("../../assets/landing/8.png", import.meta.url).href,
] as const;

function HowActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="landing-how-learn-more" type="button" onClick={onClick}>
      <span className="landing-how-learn-more-circle" aria-hidden="true">
        <span className="landing-how-learn-more-icon landing-how-learn-more-arrow"></span>
      </span>
      <span className="landing-how-learn-more-text">{label}</span>
    </button>
  );
}

const steps = [
  {
    shortLabel: "Landing",
    eyebrow: "Step 1",
    title: "Landing Page overview and project story",
    body:
      "Start on the landing page to understand what MoveComfortly does, how the project is informed, and where each major feature lives before you head into the tools.",
    details: [
      "Read the project overview and introduction",
      "See the data and feature story at a glance",
      "Open the About Us page for team and concept context",
      "Jump into the map, risks, or route tools from clear entry points",
    ],
    chips: [
      "Project overview",
      "Feature story",
      "Data context",
      "About Us",
    ],
    callout: "Use the landing page as the orientation layer before opening the tools.",
  },
  {
    shortLabel: "Map",
    eyebrow: "Step 2",
    title: "Map tools for places, comfort, compare, and area guides",
    body:
      "Open the main map to explore Ease Places, switch to Comfort Area, compare precincts, review recommendation text, and open area guide details in one flow.",
    details: [
      "Browse support places and public comfort facilities",
      "Switch to Comfort Area for live comfort conditions",
      "Compare areas and review better-time recommendations",
      "Open Area Guide details for deeper precinct context",
    ],
    chips: ["Ease Places", "Comfort Area", "Compare", "Time recommendations", "Area Guide"],
    callout: "This is the main decision-making workspace for everyday route and place planning.",
  },
  {
    shortLabel: "Risks",
    eyebrow: "Step 3",
    title: "Extreme weather risks and safety guidance",
    body:
      "Open the risks page to learn how heat, rain, storms, cold, and dry conditions affect outdoor comfort and what safer actions you can take before your trip.",
    details: [
      "Review major risk types and why they matter",
      "Read health and comfort impacts in plain language",
      "Check practical safety actions before heading out",
      "Use the quiz and follow-up pages to reinforce understanding",
    ],
    chips: ["Heat", "Rain", "Storm", "Cold", "Dry conditions", "Safety actions"],
    callout: "The risks page helps you understand whether conditions are just uncomfortable or genuinely unsafe.",
  },
  {
    shortLabel: "3D Route",
    eyebrow: "Step 4",
    title: "3D route planning and route comparison tools",
    body:
      "Use the 3D route page to build a route, adjust travel settings, compare alternatives, and inspect route conditions with a more immersive planning view.",
    details: [
      "Set start and destination points for a route",
      "Review route results and alternative choices",
      "Adjust travel mode or route-related controls",
      "Inspect route guidance in the dedicated 3D planning view",
    ],
    chips: ["3D route", "Route planning", "Alternatives", "Travel mode", "Route tools"],
    callout: "The 3D route page is for focused route planning once you already know where you want to go.",
  },
] as const;

export default function HowToUseScene() {
  const navigate = useNavigate();
  const location = useLocation();
  const detailFaceRef = useRef<HTMLSpanElement | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isDetailFlipped, setIsDetailFlipped] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(16 / 10);
  const [detailMinHeight, setDetailMinHeight] = useState(0);
  const activeStep = steps[activeStepIndex];
  const activeCallout = activeStep.callout;
  const activeScreenshotUrl = screenshotUrls[activeStepIndex];
  const openLandingPage = () => {
    if (`${location.pathname}${location.search}` === "/") return;
    navigate("/");
  };
  const openMapPage = () => {
    navigate("/map");
  };
  const openExtremeWeatherPage = () => {
    navigate("/extreme-weather-risks");
  };
  const open3DRoutePage = () => {
    navigate("/map/3d-route");
  };
  const activateStep = (index: number) => {
    setIsDetailFlipped(false);
    setActiveStepIndex(Math.max(0, Math.min(steps.length - 1, index)));
  };
  const activeAction =
    activeStepIndex === 0
      ? { label: "Open Landing", onClick: openLandingPage }
      : activeStepIndex === 1
        ? { label: "Open Map", onClick: openMapPage }
        : activeStepIndex === 2
          ? { label: "Open Risks", onClick: openExtremeWeatherPage }
          : { label: "Open 3D Route", onClick: open3DRoutePage };
  const handleStepKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown" || event.key === "PageDown") {
      event.preventDefault();
      activateStep(activeStepIndex + 1);
    }

    if (event.key === "ArrowUp" || event.key === "PageUp") {
      event.preventDefault();
      activateStep(activeStepIndex - 1);
    }
  };

  useEffect(() => {
    const node = detailFaceRef.current;
    if (!node) return;

    const updateDetailHeight = () => {
      setDetailMinHeight(node.scrollHeight);
    };

    updateDetailHeight();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateDetailHeight);
      return () => window.removeEventListener("resize", updateDetailHeight);
    }

    const observer = new ResizeObserver(() => {
      updateDetailHeight();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [activeStepIndex]);

  return (
    <section
      id="landing-next-section"
      className="landing-how-scene"
      aria-label="How to use MoveComfortly"
    >
      <div className="landing-how-inner">
        <div className="landing-how-grid">
          <div className="landing-how-copy">
            <p className="landing-how-kicker">Plan with confidence</p>
            <h2>How to Use MoveComfortly</h2>

            <div className="landing-how-steps-wrap">
              <div
                className="landing-how-steps-viewport"
                role="region"
                aria-label="MoveComfortly step navigator"
                tabIndex={0}
                onKeyDown={handleStepKeyDown}
              >
                <div className="landing-how-step-grid-shell">
                  <div className="landing-how-step-grid">
                    {steps.map((step, index) => (
                      <button
                        key={step.title}
                        className={`landing-how-step-tile landing-how-step-tile-${index + 1}${
                          activeStepIndex === index ? " is-active" : ""
                        }`}
                        type="button"
                        style={{ ["--tile-index" as string]: index }}
                        aria-pressed={activeStepIndex === index}
                        aria-current={activeStepIndex === index ? "step" : undefined}
                        onClick={() => activateStep(index)}
                      >
                        <span className="landing-how-step-tile-label">{step.shortLabel}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="landing-how-step-preview is-glass-finish" aria-live="polite">
                  <span className="landing-how-step-preview-eyebrow">{activeStep.eyebrow}</span>
                  <h3>{activeStep.title}</h3>
                  <p>{activeCallout}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="landing-how-product">
            <div
              className={`landing-how-flip-scene${isDetailFlipped ? " is-flipped" : ""}`}
              style={{
                aspectRatio: imageAspectRatio,
                minHeight: detailMinHeight > 0 ? `${detailMinHeight}px` : undefined,
              }}
            >
              <button
                className="landing-how-flip-card"
                type="button"
                onClick={() => setIsDetailFlipped((current) => !current)}
                aria-pressed={isDetailFlipped}
                aria-label={
                  isDetailFlipped
                    ? "Show the screenshot side of this MoveComfortly step"
                    : "Show the detail side of this MoveComfortly step"
                }
              >
                <span className="landing-how-flip-face landing-how-flip-face-front">
                  <figure className="landing-how-screenshot">
                    <img
                      src={activeScreenshotUrl}
                      alt="MoveComfortly map interface with places and comfort data"
                      onLoad={(event) => {
                        const { naturalWidth, naturalHeight } = event.currentTarget;
                        setImageAspectRatio(naturalWidth / Math.max(1, naturalHeight));
                      }}
                    />
                  </figure>
                </span>
                <span
                  ref={detailFaceRef}
                  className="landing-how-flip-face landing-how-flip-face-back"
                >
                  <span className="landing-how-detail-shell">
                    <span className="landing-how-detail-topline">
                      <span>{activeStep.eyebrow}</span>
                      <strong>{activeStep.shortLabel}</strong>
                    </span>
                    <span className="landing-how-detail-copy">
                      <h3>{activeStep.title}</h3>
                      <p>{activeStep.body}</p>
                    </span>
                    <span className="landing-how-detail-list-wrap">
                      <span className="landing-how-detail-list-title">What to do</span>
                      <ul
                        className="landing-how-detail-list"
                        aria-label={`${activeStep.title} details`}
                      >
                        {activeStep.details.map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                      </ul>
                    </span>
                    <span className="landing-how-chips" aria-label={`${activeStep.title} highlights`}>
                      {activeStep.chips.map((chip) => (
                        <span key={chip}>{chip}</span>
                      ))}
                    </span>
                  </span>
                </span>
              </button>
            </div>
            <div className="landing-how-action-bar" aria-live="polite">
              <span className="landing-how-flip-chip">Tap card for details</span>
              <HowActionButton label={activeAction.label} onClick={activeAction.onClick} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
