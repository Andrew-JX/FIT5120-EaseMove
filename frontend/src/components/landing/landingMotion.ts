export const LANDING_REVEAL_DURATIONS = {
  quick: 420,
  base: 760,
  slow: 960,
  linger: 680,
} as const;

export const LANDING_SETTLE_SPRING = {
  stiffness: 118,
  damping: 27,
  mass: 0.9,
} as const;

export const LANDING_REVEAL_SHIFT = {
  small: "16px",
  medium: "18px",
  large: "44px",
} as const;

export const LANDING_CHOREO_EASE = "out(4)";
