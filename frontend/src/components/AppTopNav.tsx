import { Menu } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { NavLink } from "react-router";
import { useLocation, useNavigate } from "react-router";
import landingLogo from "../assets/logo-transparent.png";
import { APP_ROUTES } from "../lib/navigation";
import "./app-top-nav.css";

export type LandingNavMode = "hero" | "transition" | "compact";
export type LandingNavTone = "light" | "dark";

type AppTopNavProps = {
  variant: "landing" | "app";
  brand?: ReactNode;
  className?: string;
  onBackToTop?: () => void;
  landingMode?: LandingNavMode;
  landingTone?: LandingNavTone;
  landingTransitionProgress?: number;
  landingOverlayOpen?: boolean;
  onLandingOverlayOpenChange?: (open: boolean) => void;
};

const navItems = [
  { to: APP_ROUTES.home, label: "Landing Page" },
  { to: APP_ROUTES.map, label: "Map" },
  { to: APP_ROUTES.map3dRoute, label: "3D Route" },
  { to: APP_ROUTES.risks, label: "Risks" },
  { to: APP_ROUTES.about, label: "About us" },
] as const;

export default function AppTopNav({
  variant,
  brand,
  className = "",
  onBackToTop,
  landingMode,
  landingTone = "light",
  landingTransitionProgress = 0,
  landingOverlayOpen = false,
  onLandingOverlayOpenChange,
}: AppTopNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [landingOverlayInternalOpen, setLandingOverlayInternalOpen] = useState(false);
  const [landingOverlayMotionState, setLandingOverlayMotionState] = useState<
    "closed" | "opening" | "open" | "closing"
  >("closed");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isEnhancedLanding = variant === "landing" && landingMode !== undefined;
  const clampedLandingProgress = Math.min(1, Math.max(0, landingTransitionProgress));
  const effectiveLandingOverlayOpen =
    typeof onLandingOverlayOpenChange === "function"
      ? landingOverlayOpen
      : landingOverlayInternalOpen;

  const setLandingOverlayOpen = (open: boolean) => {
    if (typeof onLandingOverlayOpenChange === "function") {
      onLandingOverlayOpenChange(open);
      return;
    }

    setLandingOverlayInternalOpen(open);
  };

  useEffect(() => {
    setMobileOpen(false);
    setLandingOverlayOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isEnhancedLanding) return;

    let timeoutId = 0 as unknown as number;

    if (effectiveLandingOverlayOpen) {
      setLandingOverlayMotionState((current) => {
        if (current === "open" || current === "opening") return current;
        return "opening";
      });

      timeoutId = window.setTimeout(() => {
        setLandingOverlayMotionState("open");
      }, 780);
    } else {
      setLandingOverlayMotionState((current) => {
        if (current === "closed") return current;
        return "closing";
      });

      timeoutId = window.setTimeout(() => {
        setLandingOverlayMotionState("closed");
      }, 760);
    }

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [effectiveLandingOverlayOpen, isEnhancedLanding]);

  useEffect(() => {
    if (!mobileOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      setMobileOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!isEnhancedLanding || !effectiveLandingOverlayOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLandingOverlayOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [effectiveLandingOverlayOpen, isEnhancedLanding]);

  if (isEnhancedLanding) {
    const showHeroLinks = landingMode !== "compact";
    const heroOpacity = landingMode === "hero" ? 1 : 1 - clampedLandingProgress;
    const compactOpacity = landingMode === "hero" ? 0 : clampedLandingProgress;
    const overlayVisible = landingOverlayMotionState !== "closed";
    const overlayClassName =
      landingOverlayMotionState === "opening"
        ? "is-opening"
        : landingOverlayMotionState === "open"
          ? "is-open"
          : landingOverlayMotionState === "closing"
            ? "is-closing"
            : "";
    const style = {
      "--landing-nav-progress": clampedLandingProgress.toString(),
      "--landing-hero-opacity": heroOpacity.toString(),
      "--landing-compact-opacity": compactOpacity.toString(),
    } as CSSProperties;

    const closeLandingOverlay = () => {
      setLandingOverlayOpen(false);
    };

    const toggleLandingOverlay = () => {
      setLandingOverlayOpen(!effectiveLandingOverlayOpen);
    };

    const handleLandingPageAction = () => {
      if (location.pathname === APP_ROUTES.home) {
        closeLandingOverlay();
        return;
      }

      closeLandingOverlay();
      navigate(APP_ROUTES.home);
    };

    const handleCornerRoute = (path: string) => {
      closeLandingOverlay();
      navigate(path);
    };

    return (
      <div
        ref={rootRef}
        className={`app-top-nav app-top-nav--${variant} app-top-nav--landing-enhanced app-top-nav--mode-${landingMode} app-top-nav--tone-${landingTone} ${className}`.trim()}
        style={style}
      >
        <svg aria-hidden="true" className="app-top-nav__liquid-filter">
          <filter id="landing-nav-liquid-glass-filter" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.022 0.04"
              numOctaves="2"
              seed="21"
              result="navNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="navNoise"
              scale="13"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>

        {overlayVisible ? (
          <button
            type="button"
            className="app-top-nav__landing-overlay-backdrop"
            aria-label="Close landing navigation menu"
            onClick={closeLandingOverlay}
          />
        ) : null}

        {showHeroLinks ? (
          <div
            className="app-top-nav__landing-hero-layer"
            aria-hidden={heroOpacity <= 0.01}
            style={{ opacity: heroOpacity }}
          >
            <div className={`app-top-nav__inner${brand ? "" : " app-top-nav__inner--no-brand"}`}>
              {brand ? <div className="app-top-nav__brand">{brand}</div> : null}
              <nav className="app-top-nav__links" aria-label="Global navigation">
                {navItems.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) => `app-top-nav__link${isActive ? " is-active" : ""}`}
                    end={to === APP_ROUTES.map || to === APP_ROUTES.home}
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          className={`app-top-nav__compact-trigger${overlayVisible ? " is-open" : ""}`}
          aria-label={overlayVisible ? "Close landing navigation menu" : "Open landing navigation menu"}
          aria-expanded={overlayVisible}
          onClick={toggleLandingOverlay}
          style={{
            opacity: overlayVisible ? 1 : compactOpacity,
            pointerEvents: landingMode === "hero" && !overlayVisible ? "none" : "auto",
          }}
        >
          <span className="app-top-nav__compact-copy">
            <span className="app-top-nav__compact-label app-top-nav__compact-label--menu">Menu</span>
            <span className="app-top-nav__compact-label app-top-nav__compact-label--close">Close</span>
          </span>
          <span className="app-top-nav__compact-icon-slot" aria-hidden="true">
            <span className="app-top-nav__compact-icon app-top-nav__compact-bars">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span className="app-top-nav__compact-icon app-top-nav__compact-close">
              <span className="app-top-nav__compact-close-stroke app-top-nav__compact-close-stroke--a"></span>
              <span className="app-top-nav__compact-close-stroke app-top-nav__compact-close-stroke--b"></span>
            </span>
          </span>
        </button>

        {overlayVisible ? (
          <div className={`app-top-nav__landing-overlay ${overlayClassName}`.trim()}>
            <div className="app-top-nav__landing-overlay-inner">
              <div className="app-top-nav__landing-overlay-brand">
                <img src={landingLogo} alt="EaseMove" className="app-top-nav__landing-logo" />
              </div>

              <div className="app-top-nav__landing-overlay-nav-wrap">
                <div className="app-top-nav__landing-overlay-link-mask" style={{ ["--landing-link-index" as string]: 0 }}>
                  <button
                    type="button"
                    className="app-top-nav__landing-overlay-link app-top-nav__landing-overlay-link--button"
                    onClick={handleLandingPageAction}
                  >
                    Landing Page
                  </button>
                </div>
                {navItems
                  .filter(({ to }) => to !== APP_ROUTES.home)
                  .map(({ to, label }, index) => (
                    <div
                      key={to}
                      className="app-top-nav__landing-overlay-link-mask"
                      style={{ ["--landing-link-index" as string]: index + 1 }}
                    >
                      <NavLink
                        to={to}
                        className="app-top-nav__landing-overlay-link"
                        onClick={closeLandingOverlay}
                      >
                        {label}
                      </NavLink>
                    </div>
                  ))}
              </div>

              <button
                type="button"
                className="app-top-nav__landing-corner app-top-nav__landing-corner--go"
                onClick={() => handleCornerRoute(APP_ROUTES.map3dRoute)}
              >
                Go!
              </button>
              <button
                type="button"
                className="app-top-nav__landing-corner app-top-nav__landing-corner--plan"
                onClick={() => handleCornerRoute(APP_ROUTES.map)}
              >
                Plan!
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`app-top-nav app-top-nav--${variant} ${className}`.trim()}>
      {variant === "landing" ? (
        <svg aria-hidden="true" className="app-top-nav__liquid-filter">
          <filter id="landing-nav-liquid-glass-filter" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.022 0.04"
              numOctaves="2"
              seed="21"
              result="navNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="navNoise"
              scale="13"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>
      ) : null}
      {mobileOpen ? <button type="button" className="app-top-nav__scrim" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)} /> : null}
      <div className={`app-top-nav__inner${brand ? "" : " app-top-nav__inner--no-brand"}`}>
        {brand ? <div className="app-top-nav__brand">{brand}</div> : null}
        <button
          type="button"
          className={`app-top-nav__toggle${mobileOpen ? " is-open" : ""}`}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          aria-controls={`app-top-nav-links-${variant}`}
          onClick={() => setMobileOpen((current) => !current)}
        >
          <Menu size={18} />
        </button>
        <nav
          id={`app-top-nav-links-${variant}`}
          className={`app-top-nav__links${mobileOpen ? " is-open" : ""}`}
          aria-label="Global navigation"
        >
          {variant === "app" && mobileOpen ? (
            <div className="app-top-nav__mobile-header">
              <button
                type="button"
                className="app-top-nav__mobile-close"
                aria-label="Close navigation menu"
                onClick={() => setMobileOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
          ) : null}
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `app-top-nav__link${isActive ? " is-active" : ""}`
              }
              onClick={() => setMobileOpen(false)}
              end={to === APP_ROUTES.map || to === APP_ROUTES.home}
            >
              {label}
            </NavLink>
          ))}
          {onBackToTop ? (
            <button
              type="button"
              className="app-top-nav__link app-top-nav__link--button"
              onClick={() => {
                setMobileOpen(false);
                onBackToTop();
              }}
            >
              Back to top
            </button>
          ) : null}
        </nav>
      </div>
    </div>
  );
}
