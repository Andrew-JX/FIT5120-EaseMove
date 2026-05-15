import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import "./aboutus.css";

const PORTFOLIO_URL =
  "https://eportfolio.monash.edu/view/view.php?t=837e187f170601e067b5";

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
        <h3>Monash ePortfolio</h3>
        <p>View the full portfolio in a new tab</p>
        <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
          Open portfolio
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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <div className="aboutus-page">
      {/* Hero */}
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
        <p className="aboutus-hero-kicker">MoveComfortly Melbourne</p>
        <h1>About MoveComfortly</h1>
        <p className="aboutus-hero-sub">
          MoveComfortly helps young walkers and riders understand street-level
          comfort before they travel, combining public urban data, live sensor
          signals, route previews, and weather-risk guidance for inner Melbourne.
        </p>
        <div className="aboutus-hero-actions">
          <button className="aboutus-btn-primary" onClick={() => navigate("/")}>
            Back to home
          </button>
          <button className="aboutus-btn-ghost" onClick={() => navigate("/map")}>
            Open the map
          </button>
        </div>
      </section>

      {/* Intro — Q&A + project card */}
      <section className="aboutus-intro">
        <div className="aboutus-intro-inner">
          <div className="aboutus-intro-grid">
            <div>
              <div className="aboutus-qa-block">
                <h3>What is MoveComfortly?</h3>
                <p>
                  MoveComfortly is an interactive planning experience for comparing
                  Melbourne precincts by comfort score, environmental conditions,
                  crowd activity, nearby support places, and route context before
                  heading outdoors.
                </p>
              </div>
              <div className="aboutus-qa-block">
                <h3>Who is it for?</h3>
                <p>
                  It is designed for students, young workers, walkers, cyclists,
                  and anyone making short everyday trips through inner Melbourne
                  who wants clearer comfort information than a single city-wide
                  weather forecast can provide.
                </p>
              </div>
              <div className="aboutus-qa-block">
                <h3>Why does it matter?</h3>
                <p>
                  Heat, rain, cold, air quality, shade, facilities, and activity
                  levels can change how a trip feels from one precinct to another.
                  MoveComfortly turns those signals into practical comparisons,
                  better-time suggestions, 3D route previews, and safety learning.
                </p>
              </div>
            </div>

            <div>
              <div className="aboutus-project-card">
                <div>
                  <p className="aboutus-project-card-title">Project</p>
                  <h4>MoveComfortly Melbourne</h4>
                </div>
                <div className="aboutus-tags">
                  <span className="aboutus-tag">Urban comfort</span>
                  <span className="aboutus-tag">Live sensors</span>
                  <span className="aboutus-tag">Comfort score</span>
                  <span className="aboutus-tag">3D route preview</span>
                  <span className="aboutus-tag">Extreme weather risks</span>
                  <span className="aboutus-tag">Walking &amp; cycling</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data / design note */}
      <section className="aboutus-data-note">
        <div className="aboutus-data-note-inner">
          <p className="aboutus-data-note-kicker">How the concept is informed</p>
          <h2>Grounded in public research</h2>
          <p>
            The project combines public Melbourne-related data with design research
            on walkability, microclimate, heat exposure, urban cooling, and safer
            outdoor movement. Its guidance is educational and decision-supportive,
            helping users compare conditions rather than replacing official advice.
          </p>
        </div>
      </section>

      {/* ePortfolio */}
      <section className="aboutus-portfolio">
        <div className="aboutus-portfolio-inner">
          <div className="aboutus-portfolio-header">
            <p className="aboutus-portfolio-kicker">Documentation</p>
            <h2>Project portfolio</h2>
            <p>
              View the supporting portfolio, research decisions, interface process,
              and project documentation behind MoveComfortly.
            </p>
          </div>
          <PortfolioEmbed />
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="aboutus-cta">
        <p className="aboutus-cta-kicker">Get started</p>
        <h2>Explore MoveComfortly</h2>
        <p className="aboutus-cta-sub">
          Start with the story, compare precinct comfort on the map, preview a
          3D route, or learn how extreme weather affects outdoor movement.
        </p>
        <div className="aboutus-cta-actions">
          <button className="aboutus-btn-primary" onClick={() => navigate("/")}>
            Back to home
          </button>
          <button className="aboutus-btn-ghost" onClick={() => navigate("/map")}>
            Open the map
          </button>
        </div>
      </section>
    </div>
  );
}
