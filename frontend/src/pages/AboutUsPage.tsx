import { createScope, createTimeline, stagger } from "animejs";
import { ArrowLeft, ArrowUpRight, MoveRight } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import "./aboutus.css";

const PORTFOLIO_URL =
  "https://eportfolio.monash.edu/view/view.php?t=837e187f170601e067b5";

const heroSignals = [
  {
    title: "Comfort score",
    copy: "Read how different precincts may feel before you step outside.",
  },
  {
    title: "Route preview",
    copy: "Use the 3D journey view to rehearse crossings, turns, and distance.",
  },
  {
    title: "Risk guidance",
    copy: "Turn shifting heat, rain, and exposure into timing choices.",
  },
  {
    title: "Local signals",
    copy: "Bring together facilities, activity, and street-level conditions.",
  },
] as const;

const storyBlocks = [
  {
    kicker: "What it is",
    title: "A planning layer for how a trip feels, not only where it goes.",
    copy:
      "MoveComfortly compares Melbourne precincts through comfort score, route context, nearby support places, and everyday conditions so users can prepare before leaving.",
  },
  {
    kicker: "Who it serves",
    title: "Built for students, short urban trips, and people moving on a real schedule.",
    copy:
      "The experience is designed for walkers, cyclists, and young workers who need clearer signals than a single city-wide forecast when deciding how and when to travel.",
  },
  {
    kicker: "Why it matters",
    title: "Small environmental changes can completely change the comfort of a familiar route.",
    copy:
      "Shade, heat, rain, activity, air quality, and access to support places all affect confidence outdoors. MoveComfortly helps turn those signals into practical route and timing decisions.",
  },
] as const;

const capabilityRows = [
  "Compare comfort across nearby precincts before committing to a trip.",
  "Preview route shape and elevation context in a calmer 3D scene.",
  "Understand risk changes across weather events and exposed streets.",
  "Prepare with live-adjacent signals and support-place awareness.",
] as const;

const researchPillars = [
  {
    title: "Walkability",
    copy: "Street-level movement patterns, nearby support places, and everyday trip legibility.",
  },
  {
    title: "Microclimate",
    copy: "Heat exposure, cooling, shade, and local environmental comfort signals.",
  },
  {
    title: "Weather safety",
    copy: "Educational guidance for timing, exposure, and more confident movement outdoors.",
  },
] as const;

const portfolioMarkers = ["Research", "Process", "Documentation"] as const;

function renderAnimatedWords(value: string, className: string, prefix: string) {
  return value.split(" ").map((word, index, words) => (
    <span className={className} key={`${prefix}-${word}-${index}`} aria-hidden="true">
      {word}
      {index < words.length - 1 ? "\u00A0" : ""}
    </span>
  ));
}

function renderAnimatedLines(lines: readonly string[], className: string, prefix: string) {
  return lines.map((line, index) => (
    <span className={className} key={`${prefix}-${index}`}>
      {line}
    </span>
  ));
}

function PortfolioEmbed() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const doc = iframeRef.current?.contentDocument;
        if (!doc || doc.body === null) setBlocked(true);
      } catch {
        setBlocked(true);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (blocked) {
    return (
      <div className="aboutus-portfolio-fallback">
        <div className="aboutus-portfolio-fallback-copy">
          <p className="aboutus-portfolio-fallback-kicker">Monash ePortfolio</p>
          <h3>Open the full project record in a dedicated tab</h3>
          <p>
            View the supporting process notes, design rationale, and project documentation in
            the original portfolio space.
          </p>
        </div>
        <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
          Open portfolio
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={PORTFOLIO_URL}
      title="MoveComfortly Portfolio"
      className="aboutus-portfolio-frame"
      loading="lazy"
      onError={() => setBlocked(true)}
    />
  );
}

export default function AboutUsPage() {
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useLayoutEffect(() => {
    const root = pageRef.current;
    if (!root) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      return;
    }

    const scope = createScope({ root }).add(() => {
      const heroKicker = root.querySelector(".aboutus-hero-kicker");
      const heroTitleWords = Array.from(root.querySelectorAll(".aboutus-hero-title-word"));
      const heroLines = Array.from(root.querySelectorAll(".aboutus-hero-line"));
      const heroActions = Array.from(root.querySelectorAll(".aboutus-hero-actions button"));
      const heroActionSheens = Array.from(root.querySelectorAll(".aboutus-hero-actions .aboutus-button-sheen"));
      const heroPanel = root.querySelector(".aboutus-hero-panel");
      const heroSignalCards = Array.from(root.querySelectorAll(".aboutus-signal-card"));
      const storyLead = root.querySelector(".aboutus-story-lead");
      const storyBlocksNodes = Array.from(root.querySelectorAll(".aboutus-story-block"));
      const capabilityRowsNodes = Array.from(root.querySelectorAll(".aboutus-capability-row"));
      const researchLead = root.querySelector(".aboutus-research-lead");
      const researchTrack = root.querySelector(".aboutus-research-track-fill");
      const researchPillarsNodes = Array.from(root.querySelectorAll(".aboutus-research-pillar"));
      const portfolioFrame = root.querySelector(".aboutus-portfolio-shell");
      const portfolioMarkersNodes = Array.from(root.querySelectorAll(".aboutus-portfolio-marker"));
      const ctaKicker = root.querySelector(".aboutus-cta-kicker");
      const ctaTitle = root.querySelector(".aboutus-cta-title");
      const ctaSub = root.querySelector(".aboutus-cta-sub");
      const ctaButtons = Array.from(root.querySelectorAll(".aboutus-cta-actions button"));

      const timeline = createTimeline({
        defaults: {
          duration: 760,
          ease: "inOut(3)",
        },
      });

      if (heroKicker) {
        timeline.add(heroKicker, {
          opacity: [0, 1],
          y: ["20px", "0px"],
          filter: ["blur(12px)", "blur(0px)"],
          duration: 420,
        });
      }

      if (heroTitleWords.length > 0) {
        timeline.add(
          heroTitleWords,
          {
            opacity: [0, 1],
            y: ["1.1em", "0em"],
            rotate: ["4deg", "0deg"],
            filter: ["blur(14px)", "blur(0px)"],
            delay: stagger(74),
            duration: 620,
          },
          "-=180"
        );
      }

      if (heroLines.length > 0) {
        timeline.add(
          heroLines,
          {
            opacity: [0, 1],
            y: ["18px", "0px"],
            filter: ["blur(10px)", "blur(0px)"],
            delay: stagger(86),
            duration: 560,
          },
          "-=340"
        );
      }

      if (heroActions.length > 0) {
        timeline.add(
          heroActions,
          {
            opacity: [0, 1],
            y: ["18px", "0px"],
            scale: [0.96, 1],
            delay: stagger(120),
            duration: 540,
          },
          "-=260"
        );
      }

      if (heroActionSheens.length > 0) {
        timeline.add(
          heroActionSheens,
          {
            opacity: [0, 1],
            x: ["-26px", "0px"],
            delay: stagger(110),
            duration: 360,
          },
          "-=380"
        );
      }

      if (heroPanel) {
        timeline.add(
          heroPanel,
          {
            opacity: [0, 1],
            x: ["42px", "0px"],
            y: ["24px", "0px"],
            rotate: ["-2deg", "0deg"],
            scale: [0.97, 1],
            filter: ["blur(18px)", "blur(0px)"],
            duration: 760,
          },
          "-=760"
        );
      }

      if (heroSignalCards.length > 0) {
        timeline.add(
          heroSignalCards,
          {
            opacity: [0, 1],
            x: (_target: Element, index: number) => (index % 2 === 0 ? ["-18px", "0px"] : ["18px", "0px"]),
            y: ["20px", "0px"],
            delay: stagger(96, { grid: [2, 2], from: "center" }),
            duration: 560,
          },
          "-=520"
        );
      }

      if (storyLead) {
        timeline.add(
          storyLead,
          {
            opacity: [0, 1],
            y: ["24px", "0px"],
            filter: ["blur(10px)", "blur(0px)"],
            duration: 560,
          },
          "-=180"
        );
      }

      if (storyBlocksNodes.length > 0) {
        timeline.add(
          storyBlocksNodes,
          {
            opacity: [0, 1],
            x: (_target: Element, index: number) => (index % 2 === 0 ? ["-24px", "0px"] : ["24px", "0px"]),
            y: ["24px", "0px"],
            delay: stagger(120),
            duration: 620,
          },
          "-=220"
        );
      }

      if (capabilityRowsNodes.length > 0) {
        timeline.add(
          capabilityRowsNodes,
          {
            opacity: [0, 1],
            x: ["20px", "0px"],
            delay: stagger(86),
            duration: 520,
          },
          "-=520"
        );
      }

      if (researchLead) {
        timeline.add(
          researchLead,
          {
            opacity: [0, 1],
            y: ["18px", "0px"],
            filter: ["blur(10px)", "blur(0px)"],
            duration: 520,
          },
          "-=120"
        );
      }

      if (researchTrack) {
        timeline.add(
          researchTrack,
          {
            width: ["0%", "100%"],
            opacity: [0.2, 1],
            duration: 680,
          },
          "-=160"
        );
      }

      if (researchPillarsNodes.length > 0) {
        timeline.add(
          researchPillarsNodes,
          {
            opacity: [0, 1],
            y: ["22px", "0px"],
            scale: [0.96, 1],
            delay: stagger(110),
            duration: 560,
          },
          "-=460"
        );
      }

      if (portfolioFrame) {
        timeline.add(
          portfolioFrame,
          {
            opacity: [0, 1],
            y: ["28px", "0px"],
            scale: [0.985, 1],
            filter: ["blur(14px)", "blur(0px)"],
            duration: 640,
          },
          "-=120"
        );
      }

      if (portfolioMarkersNodes.length > 0) {
        timeline.add(
          portfolioMarkersNodes,
          {
            opacity: [0, 1],
            y: ["10px", "0px"],
            delay: stagger(88),
            duration: 420,
          },
          "-=420"
        );
      }

      if (ctaKicker) {
        timeline.add(
          ctaKicker,
          {
            opacity: [0, 1],
            y: ["16px", "0px"],
            duration: 400,
          },
          "-=120"
        );
      }

      if (ctaTitle) {
        timeline.add(
          ctaTitle,
          {
            opacity: [0, 1],
            y: ["18px", "0px"],
            filter: ["blur(10px)", "blur(0px)"],
            duration: 560,
          },
          "-=220"
        );
      }

      if (ctaSub) {
        timeline.add(
          ctaSub,
          {
            opacity: [0, 1],
            y: ["18px", "0px"],
            duration: 460,
          },
          "-=320"
        );
      }

      if (ctaButtons.length > 0) {
        timeline.add(
          ctaButtons,
          {
            opacity: [0, 1],
            y: ["18px", "0px"],
            scale: [0.96, 1],
            delay: stagger(110),
            duration: 460,
          },
          "-=300"
        );
      }
    });

    return () => {
      scope.revert();
    };
  }, []);

  return (
    <div ref={pageRef} className="aboutus-page">
      <section className="aboutus-hero">
        <button
          type="button"
          className="aboutus-back-button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <div className="aboutus-shell aboutus-hero-grid">
          <div className="aboutus-hero-copy">
            <p className="aboutus-hero-kicker">MoveComfortly Melbourne</p>
            <h1 className="aboutus-hero-title">
              {renderAnimatedWords(
                "Urban comfort, seen before the trip starts.",
                "aboutus-hero-title-word",
                "hero-title"
              )}
            </h1>
            <div className="aboutus-hero-sub">
              {renderAnimatedLines(
                [
                  "MoveComfortly helps people understand how a route may feel before they travel.",
                  "It combines comfort score, route preview, support places, and weather-aware guidance for inner Melbourne.",
                ],
                "aboutus-hero-line",
                "hero-line"
              )}
            </div>
            <div className="aboutus-hero-actions">
              <button className="aboutus-btn-primary" onClick={() => navigate("/map")}>
                <span className="aboutus-button-sheen" aria-hidden="true"></span>
                Explore the map
              </button>
              <button
                className="aboutus-btn-secondary aboutus-btn-secondary--hero"
                onClick={() => navigate("/map/3d-route")}
              >
                <span className="aboutus-button-sheen" aria-hidden="true"></span>
                Open 3D route
                <MoveRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <aside className="aboutus-hero-panel" aria-label="MoveComfortly concept panel">
            <div className="aboutus-hero-panel-orbit" aria-hidden="true">
              <span className="aboutus-hero-panel-orbit-ring aboutus-hero-panel-orbit-ring--outer"></span>
              <span className="aboutus-hero-panel-orbit-ring aboutus-hero-panel-orbit-ring--inner"></span>
            </div>
            <div className="aboutus-hero-panel-header">
              <p className="aboutus-panel-kicker">Live concept panel</p>
              <h2>MoveComfortly Melbourne</h2>
              <p>
                A compact planning layer that turns street-level conditions into clearer movement
                choices.
              </p>
            </div>
            <div className="aboutus-signal-grid">
              {heroSignals.map((signal) => (
                <article key={signal.title} className="aboutus-signal-card">
                  <p className="aboutus-signal-title">{signal.title}</p>
                  <p className="aboutus-signal-copy">{signal.copy}</p>
                </article>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="aboutus-story">
        <div className="aboutus-shell aboutus-story-grid">
          <div className="aboutus-story-column">
            <div className="aboutus-story-lead">
              <p className="aboutus-section-kicker">Why it matters</p>
              <h2>A clearer picture before you leave.</h2>
              <p>
                MoveComfortly turns route comfort, local conditions, and support-place context into
                a quick pre-trip read for people moving through Melbourne on a real schedule.
              </p>
            </div>

            <div className="aboutus-story-stack">
              {storyBlocks.map((block, index) => (
                <article
                  key={block.kicker}
                  className={`aboutus-story-block aboutus-story-block--${index % 2 === 0 ? "left" : "right"}`}
                >
                  <p className="aboutus-story-block-kicker">{block.kicker}</p>
                  <h3>{block.title}</h3>
                  <p>{block.copy}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="aboutus-capability-card">
            <div className="aboutus-capability-header">
              <p className="aboutus-section-kicker">Product capability</p>
              <h3>Four ways the interface supports a better departure decision.</h3>
            </div>

            <div className="aboutus-capability-list">
              {capabilityRows.map((item) => (
                <div key={item} className="aboutus-capability-row">
                  <span className="aboutus-capability-bullet" aria-hidden="true"></span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="aboutus-research">
        <div className="aboutus-shell">
          <div className="aboutus-research-lead">
            <p className="aboutus-section-kicker">Grounded in public research</p>
            <h2>Evidence runs underneath the interface, even when the experience feels lightweight.</h2>
            <p>
              The concept brings together Melbourne-related public data and design research so the
              guidance stays educational, comparative, and practical rather than over-claiming.
            </p>
          </div>

          <div className="aboutus-research-track" aria-hidden="true">
            <span className="aboutus-research-track-fill"></span>
          </div>

          <div className="aboutus-research-grid">
            {researchPillars.map((pillar) => (
              <article key={pillar.title} className="aboutus-research-pillar">
                <span className="aboutus-research-dot" aria-hidden="true"></span>
                <h3>{pillar.title}</h3>
                <p>{pillar.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="aboutus-portfolio">
        <div className="aboutus-shell aboutus-portfolio-shell">
          <div className="aboutus-portfolio-heading">
            <div>
              <p className="aboutus-section-kicker">Project portfolio</p>
              <h2>Research / Process / Documentation</h2>
              <p>
                The portfolio captures the supporting project story behind MoveComfortly, from
                rationale and interface decisions to the broader documentation trail.
              </p>
            </div>

            <div className="aboutus-portfolio-marker-row" aria-label="Portfolio content markers">
              {portfolioMarkers.map((marker) => (
                <span key={marker} className="aboutus-portfolio-marker">
                  {marker}
                </span>
              ))}
            </div>
          </div>

          <div className="aboutus-portfolio-frame-shell">
            <PortfolioEmbed />
          </div>
        </div>
      </section>

      <section className="aboutus-cta">
        <div className="aboutus-shell aboutus-cta-shell">
          <p className="aboutus-cta-kicker">Next step</p>
          <h2 className="aboutus-cta-title">See how a route feels before you leave.</h2>
          <p className="aboutus-cta-sub">
            Start with the map for place decisions, or move into the 3D route view when you want a
            calmer preview of the journey itself.
          </p>
          <div className="aboutus-cta-actions">
            <button className="aboutus-btn-primary" onClick={() => navigate("/map")}>
              <span className="aboutus-button-sheen" aria-hidden="true"></span>
              Open the map
            </button>
            <button className="aboutus-btn-secondary" onClick={() => navigate("/map/3d-route")}>
              <span className="aboutus-button-sheen" aria-hidden="true"></span>
              Open 3D route
              <MoveRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
