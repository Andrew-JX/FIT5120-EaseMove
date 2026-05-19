import { ArrowUp } from "lucide-react";
import "./floating-back-to-top.css";

type FloatingBackToTopProps = {
  progress: number;
  tone: "light" | "dark";
  onClick?: () => void;
};

function clampProgress(progress: number) {
  return Math.max(0, Math.min(1, progress));
}

export default function FloatingBackToTop({
  progress,
  tone,
  onClick,
}: FloatingBackToTopProps) {
  const clampedProgress = clampProgress(progress);

  return (
    <button
      type="button"
      data-testid="floating-back-to-top"
      className={`floating-back-to-top floating-back-to-top--${tone}`}
      aria-label="Back to top"
      onClick={() => {
        if (onClick) {
          onClick();
          return;
        }

        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      }}
      style={{
        opacity: clampedProgress,
        pointerEvents: clampedProgress <= 0.02 ? "none" : "auto",
        transform: `translate3d(0, ${(1 - clampedProgress) * -12}px, 0) scale(${0.92 + clampedProgress * 0.08})`,
      }}
    >
      <span className="floating-back-to-top__label">Back to Top</span>
      <span className="floating-back-to-top__icon-shell" aria-hidden="true">
        <ArrowUp className="floating-back-to-top__icon" />
      </span>
    </button>
  );
}
