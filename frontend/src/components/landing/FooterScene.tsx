import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="landing-footer-accordion">
      <button
        className="landing-footer-accordion-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className={`landing-footer-accordion-icon${open ? " is-open" : ""}`}>
          {open ? "-" : "+"}
        </span>
      </button>
      {open && <div className="landing-footer-accordion-body">{children}</div>}
    </div>
  );
}

export default function FooterScene() {
  const navigate = useNavigate();
  const closingLineRef = useRef<HTMLParagraphElement | null>(null);
  const [isClosingLineRevealed, setIsClosingLineRevealed] = useState(false);
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  useEffect(() => {
    const line = closingLineRef.current;
    if (!line) return;

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || typeof window.IntersectionObserver !== "function") {
      setIsClosingLineRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsClosingLineRevealed(true);
        observer.disconnect();
      },
      { threshold: 0.42 }
    );

    observer.observe(line);

    return () => observer.disconnect();
  }, []);

  return (
    <section className="landing-footer-scene" aria-label="Site footer">
      <div className="landing-footer-transition">
        <p
          ref={closingLineRef}
          className={`landing-footer-closing-line${isClosingLineRevealed ? " is-revealed" : ""}`}
          aria-label="Find a place in Melbourne that suits you better."
        >
          <span className="landing-footer-closing-final" aria-hidden="true">
            Find a place in Melbourne that suits you better.
          </span>
          <span className="landing-footer-closing-build" aria-hidden="true">
            <span className="landing-footer-closing-half landing-footer-closing-half--left">
              Find a place in Melbourne
            </span>
            <span className="landing-footer-closing-join" />
            <span className="landing-footer-closing-half landing-footer-closing-half--right">
              that suits you better.
            </span>
          </span>
        </p>
      </div>

      <div className="landing-footer-main">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <div className="landing-footer-logo">MoveComfortly</div>
            <p className="landing-footer-tagline">
              Comfort-aware urban movement for hotter Melbourne days.
            </p>
            <p className="landing-footer-desc">
              MoveComfortly helps young walkers and riders compare precinct conditions, explore
              support places, and choose more comfortable times to move through inner Melbourne.
            </p>
          </div>

          <div className="landing-footer-col">
            <h4 className="landing-footer-col-title">Explore</h4>
            <nav className="landing-footer-nav">
              <button className="landing-footer-nav-link" onClick={() => navigate("/map")}>
                Open the map
              </button>
              <button className="landing-footer-nav-link" onClick={() => navigate("/aboutus")}>
                About us
              </button>
              <button className="landing-footer-nav-link" onClick={scrollTop}>
                Back to top
              </button>
            </nav>
          </div>

          <div className="landing-footer-col">
            <h4 className="landing-footer-col-title">What you can do</h4>
            <ul className="landing-footer-scope-list">
              <li>Compare precinct comfort</li>
              <li>Adjust travel preferences</li>
              <li>Discover support places</li>
            </ul>
          </div>

          <div className="landing-footer-col">
            <h4 className="landing-footer-col-title">Project</h4>
            <ul className="landing-footer-scope-list">
              <li>Inner Melbourne focus</li>
              <li>Young walkers &amp; riders</li>
              <li>Educational prototype</li>
            </ul>
          </div>
        </div>

        <div className="landing-footer-disclosures">
          <Accordion title="Data sources">
            <p>
              MoveComfortly draws on publicly available environmental, mobility, and place-related
              information to support comfort-aware travel exploration across inner Melbourne. Some
              data and place references may be updated, delayed, or adjusted by the original
              providers.
            </p>
            <p>
              MoveComfortly uses public information and design research related to microclimate,
              walking, cooling, and city movement in Melbourne. Where available, public
              environmental and activity-related information may be combined to support
              comfort-oriented guidance and place discovery.
            </p>
          </Accordion>

          <Accordion title="Research &amp; references">
            <ul className="landing-footer-refs">
              <li>
                City of Melbourne. (n.d.). <em>Walking | Transport Strategy 2030</em>. Participate
                Melbourne.
              </li>
              <li>
                City of Melbourne. (2018). <em>Beat the heat at these cool places in Melbourne</em>
                . City of Melbourne.
              </li>
              <li>
                Department of Transport and Planning. (2023). <em>Cooling and greening Melbourne</em>
                . Planning.
              </li>
              <li>
                Parks Victoria. (n.d.). <em>Walking fact sheet</em>.
              </li>
              <li>
                Stock, P. (2026). Melbourne swelters through hottest day in six years as severe
                heatwave descends on Australia's south-eastern states. <em>The Guardian</em>.
              </li>
            </ul>
          </Accordion>

          <Accordion title="Privacy">
            <p>
              MoveComfortly is an educational prototype designed to support comfort-aware
              exploration of walking and riding conditions in inner Melbourne.
            </p>
            <p>
              We do not require personal identity information to browse the landing experience. Any
              future analytics or usage tracking, if enabled, should be limited to essential
              service improvement and experience evaluation purposes.
            </p>
            <p>
              Public environmental, mobility, and place-related information may be used to generate
              informational guidance. MoveComfortly recommendations are supportive only and do not
              replace official weather, transport, health, emergency, or public safety advice.
            </p>
          </Accordion>
        </div>

        <div className="landing-footer-bottom">
          <div className="landing-footer-bottom-meta">
            <span>&copy; 2026 MoveComfortly Melbourne</span>
            <span className="landing-footer-bottom-sub">
              Educational prototype for urban comfort exploration
            </span>
          </div>
          <button className="landing-footer-back-top" onClick={scrollTop}>
            Back to top
          </button>
        </div>
      </div>
    </section>
  );
}
