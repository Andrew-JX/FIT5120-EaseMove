import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink } from "react-router";
import { useLocation } from "react-router";
import { APP_ROUTES } from "../lib/navigation";
import "./app-top-nav.css";

type AppTopNavProps = {
  variant: "landing" | "app";
  brand?: ReactNode;
  className?: string;
  onBackToTop?: () => void;
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
}: AppTopNavProps) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

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
