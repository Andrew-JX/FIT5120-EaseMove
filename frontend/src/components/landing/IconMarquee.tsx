import { Bike, Footprints, Route, Wind } from "lucide-react";

const marqueeItems = [
  { label: "Walk", Icon: Footprints },
  { label: "Ride", Icon: Bike },
  { label: "Cooler paths", Icon: Wind },
  { label: "Better timing", Icon: Route },
];

export default function IconMarquee() {
  const items = [...marqueeItems, ...marqueeItems];

  return (
    <div className="landing-icon-marquee" aria-label="Movement options">
      <div className="landing-icon-marquee-track">
        {items.map(({ label, Icon }, index) => (
          <div className="landing-icon-marquee-item" key={`${label}-${index}`}>
            <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
