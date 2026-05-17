import { animate, createScope, createTimeline, stagger } from "animejs";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Compass,
  Map,
  MoveRight,
  ShieldCheck,
  Sparkles,
  Waves,
  Wind,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { useNavigate } from "react-router";
import { APP_ROUTES } from "../lib/navigation";
import "./aboutus.css";

const PORTFOLIO_URL =
  "https://eportfolio.monash.edu/view/view.php?t=837e187f170601e067b5";

const heroSignals = [
  {
    label: "City-scale awareness",
    value: "Comfort field",
    copy: "Compare precinct patterns before a familiar trip becomes a draining one.",
  },
  {
    label: "Street-level reassurance",
    value: "Route rehearsal",
    copy: "Preview crossings, incline, and route mood before you commit to leaving.",
  },
  {
    label: "Heat-aware departures",
    value: "Timing cues",
    copy: "Turn heat, rain, and exposure into timing decisions that feel realistic.",
  },
] as const;

const storyPanels = [
  {
    kicker: "Signal stream",
    title: "Weather, route form, public context, and support places rarely change at the same speed.",
    copy:
      "MoveComfortly brings these signals together so users can compare how Melbourne trips may feel before they head out.",
  },
  {
    kicker: "Route atmosphere",
    title: "We treat movement as a felt experience rather than a simple line on a map.",
    copy:
      "That means paying attention to exposure, route confidence, nearby support, and the emotional ease of a journey, not only destination logic.",
  },
  {
    kicker: "Urban rhythm",
    title: "The project is designed for real departures, changing weather, and short urban trips.",
    copy:
      "That is why MoveComfortly focuses on practical route awareness, nearby support places, and easier timing decisions instead of generic travel inspiration.",
  },
] as const;

const productModules = [
  {
    title: "Map intelligence",
    copy:
      "Read comfort score patterns, local places, and route context in one composite surface.",
    meta: "Useful for fast comparison before departure.",
    icon: Map,
  },
  {
    title: "3D route preview",
    copy:
      "Step into the shape of the journey with a calmer spatial rehearsal of what comes next.",
    meta: "Useful when route texture matters as much as the destination.",
    icon: Compass,
  },
  {
    title: "Risk guidance",
    copy:
      "Translate shifting heat, rainfall, and exposure into practical movement choices.",
    meta: "Educational and actionable without over-claiming certainty.",
    icon: Waves,
  },
  {
    title: "Route atmosphere",
    copy:
      "Bring together elevation feel, exposure cues, and street confidence into a more human picture of the trip.",
    meta: "Focused on how a route feels in motion.",
    icon: Wind,
  },
  {
    title: "Support-place context",
    copy:
      "Surface the nearby places and facilities that can make an exposed route easier to manage.",
    meta: "Helpful when conditions shift mid-journey.",
    icon: ShieldCheck,
  },
  {
    title: "Journey timing",
    copy:
      "Help users decide when to leave by framing changing conditions as part of the journey, not background noise.",
    meta: "Built for daily schedules and short city trips.",
    icon: Sparkles,
  },
] as const;

const evidencePillars = [
  {
    title: "Public data context",
    copy:
      "The product draws from Melbourne-related public information and environmental signals rather than one generic city-wide reading.",
  },
  {
    title: "Comparative guidance",
    copy:
      "Users see relative conditions and route context so they can make their own judgement with more confidence.",
  },
  {
    title: "Educational framing",
    copy:
      "Risk, comfort, and support information are presented as aids for awareness and preparation, not as absolute promises.",
  },
] as const;

const archiveMarkers = [
  "Research notes",
  "Design rationale",
  "Process evidence",
  "Documentation trail",
] as const;

const signalMarquee = [
  "Signal stream",
  "Comfort field",
  "Route atmosphere",
  "Heat-aware departures",
  "Street-level reassurance",
  "Journey timing",
] as const;

function AboutUsPage() {
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement | null>(null);
  const routePathRef = useRef<SVGPathElement | null>(null);
  const modulesRailRef = useRef<HTMLDivElement | null>(null);

  const handleBack = () => {
    const historyState = window.history.state as { idx?: number } | null;
    if (typeof historyState?.idx === "number" && historyState.idx <= 0) {
      navigate(APP_ROUTES.home);
      return;
    }

    navigate(-1);
  };

  const scrollModulesRailBy = (direction: -1 | 1) => {
    const rail = modulesRailRef.current;
    if (!rail) return;

    const step = Math.min(rail.clientWidth * 0.82, 320);
    rail.scrollBy({ left: direction * step, behavior: "smooth" });
  };

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

    const canUseScrollTrigger = typeof window.matchMedia === "function";

    const animeScope = createScope({ root }).add(() => {
      const introTimeline = createTimeline({
        defaults: {
          duration: 760,
          ease: "inOut(3)",
        },
      });

      const heroKicker = root.querySelector(".aboutus-hero-kicker");
      const heroTitle = root.querySelector(".aboutus-hero-title");
      const heroCopy = root.querySelector(".aboutus-hero-copy-block");
      const heroActions = Array.from(root.querySelectorAll(".aboutus-hero-actions > *"));
      const heroConsole = root.querySelector(".aboutus-hero-console");
      const heroRoute = root.querySelector(".aboutus-hero-route-panel");
      const heroChips = Array.from(root.querySelectorAll(".aboutus-floating-chip"));
      const heroSignalsNodes = Array.from(root.querySelectorAll(".aboutus-signal-card"));
      const marqueeRows = Array.from(root.querySelectorAll(".aboutus-marquee-row"));

      if (heroKicker) {
        introTimeline.add(heroKicker, {
          opacity: [0, 1],
          y: ["18px", "0px"],
          filter: ["blur(8px)", "blur(0px)"],
          duration: 380,
        });
      }

      if (heroTitle) {
        introTimeline.add(
          heroTitle,
          {
            opacity: [0, 1],
            y: ["36px", "0px"],
            filter: ["blur(18px)", "blur(0px)"],
            duration: 620,
          },
          "-=120"
        );
      }

      if (heroCopy) {
        introTimeline.add(
          heroCopy,
          {
            opacity: [0, 1],
            y: ["24px", "0px"],
            duration: 440,
          },
          "-=260"
        );
      }

      if (heroActions.length > 0) {
        introTimeline.add(
          heroActions,
          {
            opacity: [0, 1],
            y: ["18px", "0px"],
            scale: [0.96, 1],
            delay: stagger(110),
            duration: 440,
          },
          "-=240"
        );
      }

      if (heroConsole) {
        introTimeline.add(
          heroConsole,
          {
            opacity: [0, 1],
            x: ["42px", "0px"],
            y: ["18px", "0px"],
            rotate: ["-2deg", "0deg"],
            scale: [0.97, 1],
            filter: ["blur(18px)", "blur(0px)"],
            duration: 760,
          },
          "-=680"
        );
      }

      if (heroRoute) {
        introTimeline.add(
          heroRoute,
          {
            opacity: [0, 1],
            y: ["22px", "0px"],
            scale: [0.98, 1],
            duration: 520,
          },
          "-=520"
        );
      }

      if (heroChips.length > 0) {
        introTimeline.add(
          heroChips,
          {
            opacity: [0, 1],
            y: ["14px", "0px"],
            delay: stagger(100),
            duration: 360,
          },
          "-=460"
        );
      }

      if (heroSignalsNodes.length > 0) {
        introTimeline.add(
          heroSignalsNodes,
          {
            opacity: [0, 1],
            y: ["20px", "0px"],
            x: (_target: Element, index: number) => (index % 2 === 0 ? ["-16px", "0px"] : ["16px", "0px"]),
            delay: stagger(90),
            duration: 460,
          },
          "-=320"
        );
      }

      if (marqueeRows.length > 0) {
        introTimeline.add(
          marqueeRows,
          {
            opacity: [0, 1],
            y: ["12px", "0px"],
            delay: stagger(80),
            duration: 320,
          },
          "-=380"
        );
      }

      const floatTargets = Array.from(root.querySelectorAll(".aboutus-float-node"));
      if (floatTargets.length > 0) {
        animate(floatTargets, {
          translateY: [
            { to: -8, ease: "inOutSine", duration: 1800 },
            { to: 0, ease: "inOutSine", duration: 1800 },
          ],
          delay: stagger(180),
          loop: true,
          alternate: true,
        });
      }

      const pulseTargets = Array.from(root.querySelectorAll(".aboutus-pulse-node"));
      if (pulseTargets.length > 0) {
        animate(pulseTargets, {
          scale: [
            { to: 1.06, ease: "inOutSine", duration: 1400 },
            { to: 1, ease: "inOutSine", duration: 1400 },
          ],
          opacity: [
            { to: 1, ease: "inOutSine", duration: 1400 },
            { to: 0.74, ease: "inOutSine", duration: 1400 },
          ],
          delay: stagger(160),
          loop: true,
          alternate: true,
        });
      }

      const routePanel = root.querySelector(".aboutus-hero-route-panel");
      const routeOverlay = root.querySelector(".aboutus-route-overlay");
      if (
        routePanel &&
        routeOverlay &&
        typeof (routeOverlay as SVGPathElement).getTotalLength === "function"
      ) {
        const overlayPath = routeOverlay as SVGPathElement;
        const routeLength = overlayPath.getTotalLength();
        overlayPath.style.strokeDasharray = `${routeLength}`;
        overlayPath.style.strokeDashoffset = `${routeLength}`;

        introTimeline.add(
          overlayPath,
          {
            strokeDashoffset: [routeLength, 0],
            duration: 1200,
            ease: "out(3)",
          },
          "-=420"
        );
      }
    });

    let cleanupModulesRail = () => {};
    const modulesRail = modulesRailRef.current;
    if (modulesRail) {
      const moduleCards = Array.from(modulesRail.querySelectorAll<HTMLElement>(".aboutus-module-card"));
      let isDragging = false;
      let startX = 0;
      let startScrollLeft = 0;
      let lastScrollLeft = modulesRail.scrollLeft;

      const settleCards = () => {
        moduleCards.forEach((card) => {
          gsap.to(card, {
            duration: 1.05,
            ease: "elastic.out(1, 0.42)",
            "--swing-rotate": 0,
            "--swing-shift": 0,
            overwrite: true,
          });
        });
      };

      const applySwing = (delta: number) => {
        moduleCards.forEach((card, index) => {
          const direction = index % 2 === 0 ? 1 : -1;
          const rotate = gsap.utils.clamp(-9, 9, delta * 0.16 * direction);
          const shift = gsap.utils.clamp(0, 16, Math.abs(delta) * (0.28 + (index % 3) * 0.05));

          gsap.set(card, {
            "--swing-rotate": rotate,
            "--swing-shift": shift,
          });
        });

        settleCards();
      };

      const handleScroll = () => {
        const delta = modulesRail.scrollLeft - lastScrollLeft;
        lastScrollLeft = modulesRail.scrollLeft;
        if (Math.abs(delta) > 0.2) {
          applySwing(delta);
        }
      };

      const handlePointerDown = (event: PointerEvent) => {
        if (event.button !== 0) return;
        isDragging = true;
        startX = event.clientX;
        startScrollLeft = modulesRail.scrollLeft;
        modulesRail.classList.add("is-dragging");
        modulesRail.setPointerCapture?.(event.pointerId);
        event.preventDefault();
      };

      const handlePointerMove = (event: PointerEvent) => {
        if (!isDragging) return;
        const deltaX = event.clientX - startX;
        modulesRail.scrollLeft = startScrollLeft - deltaX * 1.08;
        event.preventDefault();
      };

      const stopDragging = (event?: PointerEvent) => {
        isDragging = false;
        modulesRail.classList.remove("is-dragging");
        if (event) {
          modulesRail.releasePointerCapture?.(event.pointerId);
        }
      };

      modulesRail.addEventListener("scroll", handleScroll, { passive: true });
      modulesRail.addEventListener("pointerdown", handlePointerDown);
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", stopDragging);
      modulesRail.addEventListener("pointerleave", stopDragging);

      settleCards();

      cleanupModulesRail = () => {
        modulesRail.removeEventListener("scroll", handleScroll);
        modulesRail.removeEventListener("pointerdown", handlePointerDown);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", stopDragging);
        modulesRail.removeEventListener("pointerleave", stopDragging);
      };
    }

    const gsapContext = canUseScrollTrigger
      ? gsap.context(() => {
          gsap.registerPlugin(ScrollTrigger);

          gsap.utils.toArray<HTMLElement>(".aboutus-parallax-layer").forEach((layer, index) => {
            gsap.to(layer, {
              yPercent: index % 2 === 0 ? -10 : 10,
              ease: "none",
              scrollTrigger: {
                trigger: root,
                start: "top bottom",
                end: "bottom top",
                scrub: 1,
              },
            });
          });

          gsap.utils.toArray<HTMLElement>(".aboutus-marquee-track").forEach((track, index) => {
            gsap.fromTo(
              track,
              { xPercent: index % 2 === 0 ? 0 : -10 },
              {
                xPercent: index % 2 === 0 ? -24 : 14,
                ease: "none",
                scrollTrigger: {
                  trigger: ".aboutus-marquee",
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 1.2,
                },
              }
            );
          });

          gsap.utils.toArray<HTMLElement>(".aboutus-reveal-panel").forEach((panel, index) => {
            gsap.fromTo(
              panel,
              {
                opacity: 0,
                y: 80,
                rotateX: 8,
              },
              {
                opacity: 1,
                y: 0,
                rotateX: 0,
                duration: 1.1,
                ease: "power3.out",
                delay: index * 0.05,
                scrollTrigger: {
                  trigger: panel,
                  start: "top 84%",
                  toggleActions: "play none none reverse",
                },
              }
            );
          });

          const storyRail = root.querySelector(".aboutus-story-rail");
          const storyStage = root.querySelector(".aboutus-story-stage");
          if (storyRail && storyStage && window.innerWidth > 1080) {
            ScrollTrigger.create({
              trigger: storyStage,
              start: "top top+=88",
              end: "bottom bottom-=120",
              pin: storyRail,
              pinSpacing: false,
            });
          }

          const routePath = routePathRef.current;
          const routePanel = root.querySelector(".aboutus-hero-route-panel");
          if (routePath && routePanel) {
            gsap.to(routePanel, {
              yPercent: -8,
              ease: "none",
              scrollTrigger: {
                trigger: routePanel,
                start: "top 85%",
                end: "bottom top",
                scrub: 1,
              },
            });
          }

          gsap.fromTo(
            ".aboutus-cta-panel",
            { opacity: 0, y: 64, scale: 0.98 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 1,
              ease: "power3.out",
              scrollTrigger: {
                trigger: ".aboutus-cta-panel",
                start: "top 82%",
                toggleActions: "play none none reverse",
              },
            }
          );
        }, root)
      : null;

    return () => {
      animeScope.revert();
      cleanupModulesRail();
      gsapContext?.revert();
      if (canUseScrollTrigger) {
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      }
    };
  }, []);

  return (
    <div ref={pageRef} className="aboutus-page">
      <section className="aboutus-hero">
        <div className="aboutus-hero-noise" aria-hidden="true" />
        <div className="aboutus-hero-glow aboutus-parallax-layer aboutus-float-node" aria-hidden="true" />
        <div className="aboutus-hero-glow aboutus-hero-glow--secondary aboutus-parallax-layer aboutus-pulse-node" aria-hidden="true" />

        <button
          type="button"
          className="aboutus-back-button"
          onClick={handleBack}
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <div className="aboutus-shell aboutus-hero-grid">
          <div className="aboutus-hero-copy">
            <p className="aboutus-hero-kicker">MoveComfortly Melbourne</p>
            <h1 className="aboutus-hero-title">
              See urban comfort before the street asks you to react.
            </h1>
            <div className="aboutus-hero-copy-block">
              <p>
                MoveComfortly helps walkers, cyclists, students, and young workers compare how
                Melbourne routes may feel before they travel.
              </p>
              <p>
                The project combines comfort score, route preview, local support places, and
                weather-aware guidance so users can make calmer departure decisions.
              </p>
            </div>
            <div className="aboutus-hero-actions">
              <button className="aboutus-btn-primary" onClick={() => navigate(APP_ROUTES.map)}>
                Explore the map
              </button>
              <button
                className="aboutus-btn-secondary"
                onClick={() => navigate(APP_ROUTES.map3dRoute)}
              >
                Open 3D route
                <MoveRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <aside className="aboutus-hero-console">
            <div className="aboutus-console-header">
              <div className="aboutus-console-topline">
                <span className="aboutus-console-dot aboutus-pulse-node" aria-hidden="true" />
                About MoveComfortly
              </div>
              <p className="aboutus-console-kicker">Signal stream</p>
            </div>

            <div className="aboutus-console-heading">
              <h2>Route comfort, local support, and weather context in one planning layer.</h2>
              <p>
                MoveComfortly is built to help users understand how a trip may feel, not only
                where it goes.
              </p>
            </div>

            <div className="aboutus-console-chips">
              <span className="aboutus-floating-chip aboutus-float-node">Comfort field active</span>
              <span className="aboutus-floating-chip aboutus-floating-chip--warm aboutus-float-node">
                Heat-aware departures
              </span>
              <span className="aboutus-floating-chip aboutus-float-node">Street-level reassurance</span>
            </div>

            <div className="aboutus-signal-grid">
              {heroSignals.map((signal) => (
                <article key={signal.label} className="aboutus-signal-card">
                  <p className="aboutus-signal-label">{signal.label}</p>
                  <h3>{signal.value}</h3>
                  <p>{signal.copy}</p>
                </article>
              ))}
            </div>

            <div className="aboutus-hero-route-panel">
              <div className="aboutus-route-head">
                <p className="aboutus-route-kicker">Route atmosphere</p>
                <span className="aboutus-route-badge aboutus-pulse-node">Live concept</span>
              </div>
              <svg
                className="aboutus-route-svg"
                viewBox="0 0 320 124"
                aria-hidden="true"
                preserveAspectRatio="none"
              >
                <path
                  className="aboutus-route-base"
                  d="M10 95 C40 62 74 26 112 34 C142 40 160 102 196 102 C238 102 250 36 310 18"
                />
                <path
                  ref={routePathRef}
                  className="aboutus-route-overlay"
                  d="M10 95 C40 62 74 26 112 34 C142 40 160 102 196 102 C238 102 250 36 310 18"
                />
                <path
                  className="aboutus-route-dash"
                  d="M10 95 C40 62 74 26 112 34 C142 40 160 102 196 102 C238 102 250 36 310 18"
                />
                <circle className="aboutus-route-node aboutus-pulse-node" cx="10" cy="95" r="6" />
                <circle className="aboutus-route-node aboutus-pulse-node" cx="112" cy="34" r="6" />
                <circle className="aboutus-route-node aboutus-pulse-node" cx="196" cy="102" r="6" />
                <circle className="aboutus-route-node aboutus-pulse-node" cx="310" cy="18" r="7" />
              </svg>
            </div>
          </aside>
        </div>
      </section>

      <section className="aboutus-marquee" aria-label="Signal stream ribbon">
        <div className="aboutus-marquee-row">
          <div className="aboutus-marquee-track">
            {signalMarquee.concat(signalMarquee).map((label, index) => (
              <span key={`row-a-${label}-${index}`}>{label}</span>
            ))}
          </div>
        </div>
        <div className="aboutus-marquee-row aboutus-marquee-row--alt">
          <div className="aboutus-marquee-track">
            {signalMarquee.concat(signalMarquee).map((label, index) => (
              <span key={`row-b-${label}-${index}`}>{label}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="aboutus-story">
        <div className="aboutus-shell aboutus-story-stage">
          <aside className="aboutus-story-rail">
            <p className="aboutus-section-kicker">Why it exists</p>
            <h2>A trip is a moving atmosphere, not only a destination.</h2>
            <p>
              MoveComfortly helps people read route comfort with more nuance by bringing together
              route shape, weather exposure, comfort score, and nearby support places.
            </p>
          </aside>

          <div className="aboutus-story-stack">
            {storyPanels.map((panel, index) => (
              <article
                key={panel.kicker}
                className={`aboutus-story-panel aboutus-reveal-panel aboutus-story-panel--${index + 1}`}
              >
                <p className="aboutus-panel-kicker">{panel.kicker}</p>
                <h3>{panel.title}</h3>
                <p>{panel.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="aboutus-modules">
        <div className="aboutus-shell">
          <div className="aboutus-section-lead aboutus-reveal-panel">
            <p className="aboutus-section-kicker">What the product does</p>
            <h2>Six movement layers turn scattered urban signals into a richer departure check.</h2>
            <p>
              These parts of the project help users compare places, preview routes, understand
              weather risk, and prepare for the journey ahead.
            </p>
          </div>

          <div className="aboutus-modules-rail-shell aboutus-reveal-panel">
            <div className="aboutus-modules-rope" aria-hidden="true" />
            <p className="aboutus-modules-hint">Drag sideways to explore all six layers</p>
            <div
              ref={modulesRailRef}
              className="aboutus-modules-rail"
              aria-label="MoveComfortly capability layers carousel"
            >
            {productModules.map((module, index) => {
              const Icon = module.icon;
              const cardStyle = {
                "--card-tilt": index % 2 === 0 ? -1.6 : 1.6,
                "--hang-length": 38 + (index % 3) * 8,
              } as CSSProperties;

              return (
                <article
                  key={module.title}
                  className={`aboutus-module-card aboutus-reveal-panel aboutus-module-card--${index + 1}`}
                  style={cardStyle}
                >
                  <span className="aboutus-module-peg" aria-hidden="true" />
                  <span className="aboutus-module-string" aria-hidden="true" />
                  <div className="aboutus-module-icon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="aboutus-module-copy">
                    <h3>{module.title}</h3>
                    <p>{module.copy}</p>
                  </div>
                  <p className="aboutus-module-meta">{module.meta}</p>
                </article>
              );
            })}
            </div>
            <div className="aboutus-modules-controls">
              <button
                type="button"
                className="aboutus-modules-control"
                onClick={() => scrollModulesRailBy(-1)}
                aria-label="Scroll capability cards left"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Left</span>
              </button>
              <button
                type="button"
                className="aboutus-modules-control"
                onClick={() => scrollModulesRailBy(1)}
                aria-label="Scroll capability cards right"
              >
                <span>Right</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="aboutus-evidence">
        <div className="aboutus-shell">
          <div className="aboutus-section-lead aboutus-reveal-panel">
            <p className="aboutus-section-kicker">Trust and evidence</p>
            <h2>MoveComfortly uses public data and research to support clearer route awareness.</h2>
            <p>
              The project is designed to stay comparative and educational, so users can make better
              travel decisions without the system over-promising certainty.
            </p>
          </div>

          <div className="aboutus-evidence-grid">
            {evidencePillars.map((pillar) => (
              <article key={pillar.title} className="aboutus-evidence-card aboutus-reveal-panel">
                <Sparkles className="h-4 w-4" />
                <h3>{pillar.title}</h3>
                <p>{pillar.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="aboutus-archive">
        <div className="aboutus-shell aboutus-archive-shell aboutus-reveal-panel">
          <div className="aboutus-archive-copy">
            <p className="aboutus-section-kicker">Project archive</p>
            <h2>Explore the research and design record behind MoveComfortly.</h2>
            <p>
              The Monash ePortfolio collects the supporting research, design process, and
              documentation developed for the project.
            </p>
          </div>

          <div className="aboutus-archive-panel">
            <div className="aboutus-archive-marker-row" aria-label="Archive markers">
              {archiveMarkers.map((marker) => (
                <span key={marker} className="aboutus-archive-marker">
                  {marker}
                </span>
              ))}
            </div>

            <div className="aboutus-archive-meta">
              <p className="aboutus-archive-label">Monash ePortfolio</p>
              <h3>Research, process notes, design rationale, and supporting documentation.</h3>
              <p>
                Open the original project record in a dedicated tab when you want the full academic
                and design trail behind MoveComfortly.
              </p>
            </div>

            <a
              href={PORTFOLIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="aboutus-archive-link"
            >
              Open Monash ePortfolio
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section className="aboutus-cta">
        <div className="aboutus-shell">
          <div className="aboutus-cta-panel">
            <p className="aboutus-cta-kicker">Next step</p>
            <h2>See how a route feels before you leave.</h2>
            <p>
              Start with the map when you want place-aware comparison, or move into the 3D route
              view when the route itself deserves a calmer rehearsal.
            </p>
            <div className="aboutus-cta-actions">
              <button className="aboutus-btn-primary" onClick={() => navigate(APP_ROUTES.map)}>
                Open the map
              </button>
              <button
                className="aboutus-btn-secondary"
                onClick={() => navigate(APP_ROUTES.map3dRoute)}
              >
                Open 3D route
                <MoveRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AboutUsPage;
