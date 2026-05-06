import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { APP_ROUTES } from "../lib/navigation";
import "./app-top-nav.css";

type AppTopNavProps = {
  variant: "landing" | "app";
  brand?: ReactNode;
  className?: string;
  onBackToTop?: () => void;
};

const navItems = [
  { to: APP_ROUTES.map, label: "Map" },
  { to: APP_ROUTES.risks, label: "Risks" },
  { to: APP_ROUTES.compare, label: "Compare" },
  { to: APP_ROUTES.about, label: "About us" },
] as const;

export default function AppTopNav({
  variant,
  brand,
  className = "",
  onBackToTop,
}: AppTopNavProps) {
  return (
    <div className={`app-top-nav app-top-nav--${variant} ${className}`.trim()}>
      <div className={`app-top-nav__inner${brand ? "" : " app-top-nav__inner--no-brand"}`}>
        {brand ? <div className="app-top-nav__brand">{brand}</div> : null}
        <nav className="app-top-nav__links" aria-label="Global navigation">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `app-top-nav__link${isActive ? " is-active" : ""}`
              }
              end={to === APP_ROUTES.map || to === APP_ROUTES.home}
            >
              {label}
            </NavLink>
          ))}
          {onBackToTop ? (
            <button
              type="button"
              className="app-top-nav__link app-top-nav__link--button"
              onClick={onBackToTop}
            >
              Back to top
            </button>
          ) : null}
        </nav>
      </div>
    </div>
  );
}
