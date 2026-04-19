import { useEffect, useRef, useState } from "react";
import { navigateTo } from "../lib/navigation";
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
      title="EaseMove Portfolio"
      className="aboutus-portfolio-frame"
      loading="lazy"
      onError={() => setBlocked(true)}
    />
  );
}

export default function AboutUsPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <div className="aboutus-page">
      {/* Hero */}
      <section className="aboutus-hero">
        <p className="aboutus-hero-kicker">EaseMove Melbourne</p>
        <h1>About EaseMove</h1>
        <p className="aboutus-hero-sub">
          EaseMove is a concept-driven web experience exploring how public urban
          data can support more comfortable walking and riding decisions across
          inner Melbourne during hotter days.
        </p>
        <div className="aboutus-hero-actions">
          <button className="aboutus-btn-primary" onClick={() => navigateTo("/")}>
            Back to home
          </button>
          <button className="aboutus-btn-ghost" onClick={() => navigateTo("/map")}>
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
                <h3>What is EaseMove?</h3>
                <p>
                  EaseMove is a prototype that explores how public environmental
                  and city activity information can be translated into more
                  understandable travel-comfort guidance for young walkers and
                  riders.
                </p>
              </div>
              <div className="aboutus-qa-block">
                <h3>Who is it for?</h3>
                <p>
                  EaseMove is designed with young adults in mind, especially
                  students and part-time workers moving through inner Melbourne
                  on foot or by bike.
                </p>
              </div>
              <div className="aboutus-qa-block">
                <h3>Why does it matter?</h3>
                <p>
                  Hotter days can make everyday movement more tiring, less
                  comfortable, and sometimes less safe. General weather
                  information is often too broad to reflect how different city
                  precincts may feel at street level.
                </p>
              </div>
            </div>

            <div>
              <div className="aboutus-project-card">
                <div>
                  <p className="aboutus-project-card-title">Project</p>
                  <h4>EaseMove Melbourne</h4>
                </div>
                <div className="aboutus-tags">
                  <span className="aboutus-tag">Urban comfort</span>
                  <span className="aboutus-tag">Public data</span>
                  <span className="aboutus-tag">Walking &amp; cycling</span>
                  <span className="aboutus-tag">Inner Melbourne</span>
                  <span className="aboutus-tag">Heat resilience</span>
                  <span className="aboutus-tag">Educational prototype</span>
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
            The project is informed by public Melbourne-related resources on
            walking, cooling, heat, and place-based comfort. It explores how
            environmental and urban activity signals could support more locally
            meaningful movement decisions.
          </p>
        </div>
      </section>

      {/* ePortfolio */}
      <section className="aboutus-portfolio">
        <div className="aboutus-portfolio-inner">
          <div className="aboutus-portfolio-header">
            <p className="aboutus-portfolio-kicker">Documentation</p>
            <h2>Project portfolio</h2>
            <p>View our supporting portfolio and project documentation.</p>
          </div>
          <PortfolioEmbed />
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="aboutus-cta">
        <p className="aboutus-cta-kicker">Get started</p>
        <h2>Explore EaseMove</h2>
        <p className="aboutus-cta-sub">
          Explore the landing story or go directly to the interactive map
          experience.
        </p>
        <div className="aboutus-cta-actions">
          <button className="aboutus-btn-primary" onClick={() => navigateTo("/")}>
            Back to home
          </button>
          <button className="aboutus-btn-ghost" onClick={() => navigateTo("/map")}>
            Open the map
          </button>
        </div>
      </section>
    </div>
  );
}
