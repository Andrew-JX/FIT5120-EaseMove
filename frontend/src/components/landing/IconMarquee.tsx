import { Bike, Footprints, Route, Wind } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

const walkGifUrl = new URL("../../assets/landing/walk.gif", import.meta.url).href;

const marqueeItems = [
  { label: "Walk", Icon: Footprints, kind: "walk" },
  { label: "Ride", Icon: Bike, kind: "ride" },
  { label: "Cooler paths", Icon: Wind, kind: "cool" },
  { label: "Better timing", Icon: Route, kind: "timing" },
];

export default function IconMarquee() {
  const items = [...marqueeItems, ...marqueeItems];
  const [walkActive, setWalkActive] = useState(false);
  const canUseDocument = typeof document !== "undefined";

  return (
    <>
      <div className="landing-icon-marquee" aria-label="Movement options">
        <div className="landing-icon-marquee-track">
          {items.map(({ label, Icon, kind }, index) => (
            <div
              className="landing-icon-marquee-item"
              data-kind={kind}
              key={`${label}-${index}`}
              onMouseEnter={() => {
                if (kind === "walk") setWalkActive(true);
              }}
              onMouseLeave={() => {
                if (kind === "walk") setWalkActive(false);
              }}
              onFocus={() => {
                if (kind === "walk") setWalkActive(true);
              }}
              onBlur={() => {
                if (kind === "walk") setWalkActive(false);
              }}
            >
              <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
      {canUseDocument && walkActive
        ? createPortal(
            <img className="landing-walk-page-gif" src={walkGifUrl} alt="" aria-hidden="true" />,
            document.body
          )
        : null}
    </>
  );
}
