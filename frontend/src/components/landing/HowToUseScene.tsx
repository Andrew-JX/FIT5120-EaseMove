import { useState } from "react";

const screenshotUrl = new URL("../../assets/landing/5.png", import.meta.url).href;

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
] as const;

export default function HowToUseScene() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const activeCallout = steps[activeStepIndex].callout;

  return (
    <section className="landing-how-scene" aria-label="How to use EaseMove">
      <div className="landing-how-inner">
        <div className="landing-how-grid">
          <div className="landing-how-copy">
            <p className="landing-how-kicker">Plan with confidence</p>
            <h2>How to Use EaseMove</h2>
            <p className="landing-how-subtitle">
              Explore cool places, check comfort conditions, and compare options before you head
              out.
            </p>

            <div className="landing-how-steps-wrap">
              <ol className="landing-how-steps">
                {steps.map((step, index) => (
                  <li key={step.title}>
                    <button
                      className={`landing-how-step${activeStepIndex === index ? " is-active" : ""}`}
                      type="button"
                      aria-pressed={activeStepIndex === index}
                      onClick={() => setActiveStepIndex(index)}
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
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="landing-how-product">
            <figure className="landing-how-screenshot">
              <img src={screenshotUrl} alt="EaseMove map interface with places and comfort data" />
            </figure>
            <div className="landing-how-callout" aria-live="polite">
              <span>Using EaseMove</span>
              <p>{activeCallout}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
