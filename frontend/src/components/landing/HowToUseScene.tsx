import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { navigateTo } from "../../lib/navigation";

const screenshotUrls = [
  new URL("../../assets/landing/5.png", import.meta.url).href,
  new URL("../../assets/landing/6.png", import.meta.url).href,
  new URL("../../assets/landing/7.png", import.meta.url).href,
  new URL("../../assets/landing/8.png", import.meta.url).href,
  new URL("../../assets/landing/9.png", import.meta.url).href,
] as const;
const areaDetailExamplePath = "/map?area=melbourne-cbd";

const steps = [
  {
    eyebrow: "Step 1",
    title: "Explore cool spots and support places",
    body:
      "Start with the default Ease Places layer to discover places that can support a more comfortable trip.",
    details: [
      "Click markers for details",
      "Check opening hours",
      "Find air conditioning support",
      "Browse place categories",
    ],
    chips: [
      "Arts, Culture & Enrichment",
      "Recreation / Leisure & Open Spaces",
      "Shopping",
      "Street Furniture",
      "Drinking Water",
      "Bicycle Rack",
      "Seat",
    ],
    callout: "Ease Places helps you find practical support before the trip starts.",
  },
  {
    eyebrow: "Step 2",
    title: "Switch to Comfort Area for live conditions",
    body:
      "Move to the Comfort Area layer to view area-level comfort conditions across the city.",
    details: [
      "Use the Comfort Preferences panel",
      "Read the comfort legend",
      "Comfortable (70-100)",
      "Caution (40-69)",
      "High Risk (0-39)",
      "No sensor data",
    ],
    chips: ["Comfort score", "Temperature", "Humidity", "Pedestrian density", "Wind speed"],
    callout: "Tap a place or area to check what conditions feel like right now.",
  },
  {
    eyebrow: "Step 3",
    title: "Compare places and choose better times",
    body:
      "Compare two locations, review differences, then use suggestions and recommended time windows to decide where and when to go.",
    details: [
      "Compare two places",
      "Review side-by-side differences",
      "Read suggestion text",
      "Choose recommended times",
    ],
    chips: ["Side-by-side view", "Suggestion", "Recommended times"],
    callout: "Pick the better-feeling option, then choose the time window that works best.",
  },
  {
    eyebrow: "Step 4",
    title: "Check extreme weather risks before heading out",
    body:
      "Open the extreme weather page to understand major weather-related risks, health impacts, and what actions help you stay safer outdoors.",
    details: [
      "Review heat, storm, rain, cold, and dry-condition risks",
      "See why each risk happens",
      "Read practical safety actions",
      "Try the quick quiz to test your understanding",
    ],
    chips: ["Extreme weather", "Health impacts", "Safety actions", "Quiz"],
    callout:
      "Use the extreme weather guide to spot risks early and choose safer actions before your trip.",
  },
  {
    eyebrow: "Step 5",
    title: "Open area details and nearby public facilities",
    body:
      "Select an interactive area on the map to open its area introduction, neighbourhood tags, comfort route ideas, and recommended places.",
    details: [
      "Open an area detail page from the map",
      "Read the area character and quick tags",
      "Tap a recommended place in that area",
      "Check nearby bike racks, drinking fountains, and seats",
    ],
    chips: ["Area introduction", "Recommendation", "Comfort routes", "Nearby facilities"],
    callout:
      "Use the area detail flow to understand a precinct first, then open a recommended place to see nearby public comfort support.",
  },
] as const;

export default function HowToUseScene() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const activeCallout = steps[activeStepIndex].callout;
  const activeScreenshotUrl = screenshotUrls[activeStepIndex];
  const isExtremeWeatherStep = activeStepIndex === 3;
  const isAreaDetailStep = activeStepIndex === 4;
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const wheelLockRef = useRef(false);
  const touchStartYRef = useRef<number | null>(null);
  const touchDeltaYRef = useRef(0);
  const isMapStep = activeStepIndex < 3;
  const openExtremeWeatherPage = () => {
    navigateTo("/extreme-weather-risks");
  };
  const openMapPage = () => {
    navigateTo("/map");
  };
  const openAreaDetailExample = () => {
    if (`${window.location.pathname}${window.location.search}` === areaDetailExamplePath) return;
    window.history.pushState({}, "", areaDetailExamplePath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  const activateStep = (index: number) => {
    setActiveStepIndex(Math.max(0, Math.min(steps.length - 1, index)));
  };
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
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (wheelLockRef.current || Math.abs(event.deltaY) < 12) return;

      wheelLockRef.current = true;
      activateStep(activeStepIndex + (event.deltaY > 0 ? 1 : -1));

      window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 520);
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      viewport.removeEventListener("wheel", handleWheel);
    };
  }, [activeStepIndex]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleTouchStart = (event: TouchEvent) => {
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
      touchDeltaYRef.current = 0;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const startY = touchStartYRef.current;
      const currentY = event.touches[0]?.clientY;
      if (startY === null || currentY === undefined) return;

      touchDeltaYRef.current = currentY - startY;

      if (Math.abs(touchDeltaYRef.current) > 8) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const changedY = event.changedTouches[0]?.clientY;
      const startY = touchStartYRef.current;
      const deltaY =
        changedY !== undefined && startY !== null ? changedY - startY : touchDeltaYRef.current;

      touchStartYRef.current = null;
      touchDeltaYRef.current = 0;

      if (wheelLockRef.current || Math.abs(deltaY) < 36) return;

      event.preventDefault();
      event.stopPropagation();

      wheelLockRef.current = true;
      activateStep(activeStepIndex + (deltaY < 0 ? 1 : -1));

      window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 520);
    };

    viewport.addEventListener("touchstart", handleTouchStart, { passive: true });
    viewport.addEventListener("touchmove", handleTouchMove, { passive: false });
    viewport.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      viewport.removeEventListener("touchstart", handleTouchStart);
      viewport.removeEventListener("touchmove", handleTouchMove);
      viewport.removeEventListener("touchend", handleTouchEnd);
    };
  }, [activeStepIndex]);

  return (
    <section className="landing-how-scene" aria-label="How to use MoveComfortly">
      <div className="landing-how-inner">
        <div className="landing-how-grid">
          <div className="landing-how-copy">
            <p className="landing-how-kicker">Plan with confidence</p>
            <h2>How to Use MoveComfortly</h2>

            <div className="landing-how-steps-wrap">
              <div
                ref={viewportRef}
                className="landing-how-steps-viewport"
                role="region"
                aria-label="MoveComfortly step cards"
                tabIndex={0}
                onKeyDown={handleStepKeyDown}
              >
                <ol className="landing-how-steps">
                {steps.map((step, index) => (
                  <motion.li
                    key={step.title}
                    className="landing-how-step-item"
                    initial={false}
                    animate={{
                      y:
                        index === activeStepIndex
                          ? 0
                          : index < activeStepIndex
                            ? -110
                            : index === activeStepIndex + 1
                              ? 110
                              : 150,
                      z:
                        index === activeStepIndex
                          ? 0
                          : index < activeStepIndex
                            ? -120
                            : index === activeStepIndex + 1
                              ? -80
                              : -140,
                      scale:
                        index === activeStepIndex
                          ? 1
                          : index < activeStepIndex
                            ? 0.82
                            : index === activeStepIndex + 1
                              ? 0.86
                              : 0.78,
                      opacity:
                        index === activeStepIndex
                          ? 1
                          : index < activeStepIndex
                            ? 0
                            : index === activeStepIndex + 1
                              ? 0.52
                              : 0,
                      rotateX:
                        index === activeStepIndex
                          ? 0
                          : index < activeStepIndex
                            ? 18
                            : index === activeStepIndex + 1
                              ? -12
                              : -16,
                      zIndex:
                        index === activeStepIndex
                          ? 4
                          : index === activeStepIndex + 1
                            ? 3
                            : index === activeStepIndex - 1
                              ? 2
                              : 1,
                    }}
                    transition={{
                      duration: 0.62,
                      ease: [0.25, 1, 0.5, 1],
                    }}
                  >
                    <button
                      className={`landing-how-step${activeStepIndex === index ? " is-active" : ""}`}
                      type="button"
                      aria-pressed={activeStepIndex === index}
                      aria-current={activeStepIndex === index ? "step" : undefined}
                      onClick={() => activateStep(index)}
                    >
                      <span className="landing-how-step-eyebrow">{step.eyebrow}</span>
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                      <ul className="landing-how-detail-list" aria-label={`${step.title} details`}>
                        {step.details.map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                      </ul>
                      <div className="landing-how-chips" aria-label={`${step.title} highlights`}>
                        {step.chips.map((chip) => (
                          <span key={chip}>{chip}</span>
                        ))}
                      </div>
                    </button>
                  </motion.li>
                ))}
                </ol>
              </div>
              <p className="landing-how-steps-hint">Scroll to move through the steps</p>
            </div>
          </div>

          <div className="landing-how-product">
            <figure className="landing-how-screenshot">
              <img
                src={activeScreenshotUrl}
                alt="MoveComfortly map interface with places and comfort data"
              />
            </figure>
            <div className="landing-how-callout" aria-live="polite">
              <span>Using MoveComfortly</span>
              <p>{activeCallout}</p>
            </div>
            {isMapStep ? (
              <button className="landing-how-action" type="button" onClick={openMapPage}>
                Open the Map
              </button>
            ) : null}
            {isAreaDetailStep ? (
              <button
                className="landing-how-action"
                type="button"
                onClick={openAreaDetailExample}
              >
                Explore an Area Detail Example
              </button>
            ) : null}
            {isExtremeWeatherStep ? (
              <button
                className="landing-how-action"
                type="button"
                onClick={openExtremeWeatherPage}
              >
                Explore Extreme Weather Risks
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
