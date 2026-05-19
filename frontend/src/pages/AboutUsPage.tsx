import { animate, createScope, createTimeline, stagger } from "animejs";
import confetti from "canvas-confetti";
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
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router";
import AppTopNav, { type LandingNavMode, type LandingNavTone } from "../components/AppTopNav";
import FloatingBackToTop from "../components/FloatingBackToTop";
import { APP_ROUTES } from "../lib/navigation";
import aboutUsEndingEasterEggGif from "../assets/aboutus/aboutus-ending-easter-egg.gif";
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

const ABOUT_NAV_COMPACT_SCROLL_Y = 140;
const ABOUT_NAV_MOBILE_QUERY = "(max-width: 720px)";
const ABOUT_NAV_TONE_PROBE_Y = 96;
const ABOUT_DARK_SECTION_SELECTORS = [".aboutus-hero", ".aboutus-evidence"] as const;

const ABOUTUS_ENDING_EASTER_EGG_DELAY_MS = 2000;
const ABOUTUS_ENDING_EASTER_EGG_VISIBLE_MS = 3400;

const endingOrbiters = [
  { x: "-38vw", y: "-18vh", rotate: -26, scale: 0.74, delayMs: 90 },
  { x: "-24vw", y: "-28vh", rotate: -14, scale: 0.62, delayMs: 150 },
  { x: "-8vw", y: "-32vh", rotate: 8, scale: 0.68, delayMs: 0 },
  { x: "13vw", y: "-30vh", rotate: 14, scale: 0.64, delayMs: 180 },
  { x: "32vw", y: "-18vh", rotate: 22, scale: 0.7, delayMs: 120 },
  { x: "-34vw", y: "12vh", rotate: -12, scale: 0.6, delayMs: 210 },
  { x: "-18vw", y: "22vh", rotate: -6, scale: 0.56, delayMs: 260 },
  { x: "19vw", y: "24vh", rotate: 10, scale: 0.58, delayMs: 230 },
  { x: "36vw", y: "10vh", rotate: 18, scale: 0.64, delayMs: 300 },
] as const;

const endingFireworks = [
  { x: "12%", y: "26%", size: "clamp(108px, 16vw, 220px)", hue: "gold", delayMs: 60 },
  { x: "82%", y: "22%", size: "clamp(120px, 18vw, 250px)", hue: "mint", delayMs: 180 },
  { x: "22%", y: "72%", size: "clamp(92px, 14vw, 188px)", hue: "peach", delayMs: 310 },
  { x: "76%", y: "70%", size: "clamp(108px, 15vw, 220px)", hue: "gold", delayMs: 430 },
  { x: "50%", y: "14%", size: "clamp(84px, 12vw, 168px)", hue: "mint", delayMs: 250 },
] as const;

function launchEndingFireworks(canvas: HTMLCanvasElement) {
  const runBurst = confetti.create(canvas, {
    resize: true,
    useWorker: false,
  });

  const bursts = [
    {
      delayMs: 0,
      options: {
        particleCount: 96,
        startVelocity: 45,
        spread: 76,
        ticks: 220,
        gravity: 0.94,
        scalar: 1.1,
        origin: { x: 0.18, y: 0.34 },
        colors: ["#ffd166", "#ffe29a", "#ffb36b", "#f9f3e9"],
      },
    },
    {
      delayMs: 160,
      options: {
        particleCount: 102,
        startVelocity: 52,
        spread: 86,
        ticks: 240,
        gravity: 0.92,
        scalar: 1.18,
        origin: { x: 0.84, y: 0.26 },
        colors: ["#7ef0e1", "#bdf7ef", "#d8fff8", "#f2fffd"],
      },
    },
    {
      delayMs: 300,
      options: {
        particleCount: 90,
        startVelocity: 40,
        spread: 74,
        ticks: 230,
        gravity: 0.98,
        scalar: 0.98,
        origin: { x: 0.26, y: 0.74 },
        colors: ["#ffb38a", "#ffd2ba", "#fff0e8", "#ffe08c"],
      },
    },
    {
      delayMs: 430,
      options: {
        particleCount: 108,
        startVelocity: 55,
        spread: 92,
        ticks: 260,
        gravity: 0.9,
        scalar: 1.24,
        origin: { x: 0.74, y: 0.68 },
        colors: ["#ffd166", "#ffe7a6", "#8ef4e6", "#ffffff"],
      },
    },
    {
      delayMs: 620,
      options: {
        particleCount: 68,
        startVelocity: 34,
        spread: 60,
        ticks: 200,
        gravity: 1.02,
        scalar: 0.82,
        origin: { x: 0.5, y: 0.18 },
        colors: ["#ffffff", "#d8fff8", "#ffe9bf"],
      },
    },
  ] as const;

  const timeoutIds = bursts.map(({ delayMs, options }) =>
    window.setTimeout(() => {
      runBurst({
        ...options,
        shapes: ["circle"],
      });
      runBurst({
        ...options,
        particleCount: Math.round(options.particleCount * 0.36),
        startVelocity: options.startVelocity + 8,
        decay: 0.92,
        scalar: options.scalar * 0.78,
        shapes: ["star"],
      });
    }, delayMs)
  );

  return () => {
    timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
  };
}

function AboutUsPage() {
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement | null>(null);
  const routePathRef = useRef<SVGPathElement | null>(null);
  const modulesRailRef = useRef<HTMLDivElement | null>(null);
  const endingTriggerRef = useRef<HTMLDivElement | null>(null);
  const endingFireworksCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const endingHoldTimerRef = useRef<number | null>(null);
  const endingHideTimerRef = useRef<number | null>(null);
  const aboutOverlayScrollYRef = useRef(0);
  const [showEndingEasterEgg, setShowEndingEasterEgg] = useState(false);
  const [hasPlayedEndingEasterEgg, setHasPlayedEndingEasterEgg] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [landingMode, setLandingMode] = useState<LandingNavMode>("hero");
  const [landingTone, setLandingTone] = useState<LandingNavTone>("light");
  const [landingTransitionProgress, setLandingTransitionProgress] = useState(0);
  const [landingOverlayOpen, setLandingOverlayOpen] = useState(false);
  const [backToTopProgress, setBackToTopProgress] = useState(0);

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

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setLandingTransitionProgress(0);
      setLandingMode("hero");
      return;
    }

    const mediaQuery = window.matchMedia(ABOUT_NAV_MOBILE_QUERY);
    const computeLandingMode = (event?: MediaQueryListEvent) => {
      const isMobile = event ? event.matches : mediaQuery.matches;
      const isProbeOnDarkSection = ABOUT_DARK_SECTION_SELECTORS.some((selector) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return rect.top <= ABOUT_NAV_TONE_PROBE_Y && rect.bottom >= ABOUT_NAV_TONE_PROBE_Y;
      });
      setLandingTone(isProbeOnDarkSection ? "light" : "dark");
      setBackToTopProgress(Math.min(1, Math.max(0, window.scrollY / ABOUT_NAV_COMPACT_SCROLL_Y)));

      if (isMobile) {
        setLandingTransitionProgress(1);
        setLandingMode("compact");
        return;
      }

      const progress = Math.min(1, Math.max(0, window.scrollY / ABOUT_NAV_COMPACT_SCROLL_Y));
      setLandingTransitionProgress(progress);
      setLandingMode(progress <= 0.001 ? "hero" : progress >= 0.999 ? "compact" : "transition");
    };

    computeLandingMode();
    window.addEventListener("scroll", computeLandingMode, { passive: true });
    window.addEventListener("resize", computeLandingMode);
    mediaQuery.addEventListener("change", computeLandingMode);

    return () => {
      window.removeEventListener("scroll", computeLandingMode);
      window.removeEventListener("resize", computeLandingMode);
      mediaQuery.removeEventListener("change", computeLandingMode);
    };
  }, []);

  useEffect(() => {
    const restoreScroll = () => {
      const lockedScrollY = aboutOverlayScrollYRef.current;
      delete document.body.dataset.landingLockedScrollY;

      if (lockedScrollY > 0 && Math.abs(window.scrollY - lockedScrollY) > 1) {
        window.scrollTo({ top: lockedScrollY, left: 0, behavior: "auto" });
      }
    };

    if (!landingOverlayOpen) {
      restoreScroll();
      return;
    }

    const lockedScrollY = aboutOverlayScrollYRef.current;
    document.body.dataset.landingLockedScrollY = String(lockedScrollY);

    const restoreLockedPosition = () => {
      if (Math.abs(window.scrollY - lockedScrollY) > 1) {
        window.scrollTo({ top: lockedScrollY, left: 0, behavior: "auto" });
      }
    };

    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(restoreLockedPosition);
    } else {
      restoreLockedPosition();
    }

    return restoreScroll;
  }, [landingOverlayOpen]);

  const handleLandingOverlayOpenChange = (open: boolean) => {
    if (open) {
      aboutOverlayScrollYRef.current = window.scrollY;
      document.body.dataset.landingLockedScrollY = String(window.scrollY);
    }

    setLandingOverlayOpen(open);
  };

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = (event?: MediaQueryListEvent) => {
      setPrefersReducedMotion(event ? event.matches : mediaQuery.matches);
    };

    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);
    return () => {
      mediaQuery.removeEventListener("change", syncPreference);
    };
  }, []);

  useEffect(() => {
    if (hasPlayedEndingEasterEgg) return;

    const clearHoldTimer = () => {
      if (endingHoldTimerRef.current !== null) {
        window.clearTimeout(endingHoldTimerRef.current);
        endingHoldTimerRef.current = null;
      }
    };

    const scheduleEndingEasterEgg = () => {
      const trigger = endingTriggerRef.current;
      if (!trigger || hasPlayedEndingEasterEgg) return;

      const rect = trigger.getBoundingClientRect();
      const isAtBottom = rect.top <= window.innerHeight - 24 && rect.bottom >= 0;

      if (!isAtBottom) {
        clearHoldTimer();
        return;
      }

      if (endingHoldTimerRef.current !== null) return;

      endingHoldTimerRef.current = window.setTimeout(() => {
        endingHoldTimerRef.current = null;
        setHasPlayedEndingEasterEgg(true);
        setShowEndingEasterEgg(true);
        endingHideTimerRef.current = window.setTimeout(() => {
          setShowEndingEasterEgg(false);
          endingHideTimerRef.current = null;
        }, prefersReducedMotion ? 1800 : ABOUTUS_ENDING_EASTER_EGG_VISIBLE_MS);
      }, ABOUTUS_ENDING_EASTER_EGG_DELAY_MS);
    };

    scheduleEndingEasterEgg();
    window.addEventListener("scroll", scheduleEndingEasterEgg, { passive: true });
    window.addEventListener("resize", scheduleEndingEasterEgg);

    return () => {
      clearHoldTimer();
      window.removeEventListener("scroll", scheduleEndingEasterEgg);
      window.removeEventListener("resize", scheduleEndingEasterEgg);
    };
  }, [hasPlayedEndingEasterEgg, prefersReducedMotion]);

  useEffect(() => {
    return () => {
      if (endingHoldTimerRef.current !== null) {
        window.clearTimeout(endingHoldTimerRef.current);
      }
      if (endingHideTimerRef.current !== null) {
        window.clearTimeout(endingHideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showEndingEasterEgg || prefersReducedMotion) return;

    const canvas = endingFireworksCanvasRef.current;
    if (!canvas) return;

    return launchEndingFireworks(canvas);
  }, [prefersReducedMotion, showEndingEasterEgg]);

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
      <div className={`landing-global-nav-shell${landingOverlayOpen ? " is-nav-overlay-open" : ""}`}>
        <AppTopNav
          variant="landing"
          landingMode={landingMode}
          landingTone={landingTone}
          landingTransitionProgress={landingTransitionProgress}
          landingOverlayOpen={landingOverlayOpen}
          onLandingOverlayOpenChange={handleLandingOverlayOpenChange}
        />
      </div>
      <FloatingBackToTop
        progress={backToTopProgress}
        tone={landingTone}
      />

      {showEndingEasterEgg ? (
        <div
          className={`aboutus-ending-celebration${prefersReducedMotion ? " aboutus-ending-celebration--reduced" : ""}`}
          data-testid="aboutus-ending-easter-egg"
          aria-live="polite"
          style={{ ["--aboutus-ending-duration" as string]: `${prefersReducedMotion ? 2400 : ABOUTUS_ENDING_EASTER_EGG_VISIBLE_MS}ms` }}
        >
          <div className="aboutus-ending-celebration__veil" aria-hidden="true" />
          <canvas ref={endingFireworksCanvasRef} className="aboutus-ending-fireworks-canvas" aria-hidden="true" />
          <div className="aboutus-ending-celebration__stage">
            {endingFireworks.map((firework, index) => (
              <span
                key={`firework-${index}`}
                className={`aboutus-ending-firework aboutus-ending-firework--${firework.hue}`}
                style={
                  {
                    "--firework-x": firework.x,
                    "--firework-y": firework.y,
                    "--firework-size": firework.size,
                    "--firework-delay": `${firework.delayMs}ms`,
                  } as CSSProperties
                }
                aria-hidden="true"
              />
            ))}

            <div className="aboutus-ending-burst" aria-hidden="true">
              {endingOrbiters.map((orbiter, index) => (
                <img
                  key={`orbiter-${index}`}
                  src={aboutUsEndingEasterEggGif}
                  alt=""
                  className="aboutus-ending-emoji aboutus-ending-emoji--orbiter"
                  style={
                    {
                      "--emoji-x": orbiter.x,
                      "--emoji-y": orbiter.y,
                      "--emoji-rotate": `${orbiter.rotate}deg`,
                      "--emoji-scale": orbiter.scale,
                      "--emoji-delay": `${orbiter.delayMs}ms`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>

            <div className="aboutus-ending-centerpiece">
              <img
                src={aboutUsEndingEasterEggGif}
                alt="Celebration sticker"
                className="aboutus-ending-emoji aboutus-ending-emoji--hero"
              />
              <p className="aboutus-ending-copy">You made it all the way.</p>
              <p className="aboutus-ending-subcopy">That kind of curiosity deserves fireworks.</p>
            </div>
          </div>
        </div>
      ) : null}

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
        <div ref={endingTriggerRef} className="aboutus-ending-trigger" data-testid="aboutus-easter-egg-trigger" aria-hidden="true" />
      </section>
    </div>
  );
}

export default AboutUsPage;
