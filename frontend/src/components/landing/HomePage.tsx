import { useEffect, useLayoutEffect, useRef, useState } from "react";
import AppTopNav, { type LandingNavMode, type LandingNavTone } from "../AppTopNav";
import FooterScene from "./FooterScene";
import HeroSplitScene from "./HeroSplitScene";
import HowToUseScene from "./HowToUseScene";
import MissionGalleryScene from "./MissionGalleryScene";
import StartUsingScene from "./StartUsingScene";
import { resetLandingSceneController } from "./landingSceneController";
import "./landing.css";

function resetLandingEntryState() {
  resetLandingSceneController();
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";
  document.body.style.overscrollBehavior = "";
}

export default function HomePage() {
  const [landingMode, setLandingMode] = useState<LandingNavMode>("hero");
  const [landingTone, setLandingTone] = useState<LandingNavTone>("light");
  const [landingTransitionProgress, setLandingTransitionProgress] = useState(0);
  const [landingOverlayOpen, setLandingOverlayOpen] = useState(false);
  const landingOverlayScrollYRef = useRef(0);

  useLayoutEffect(() => {
    resetLandingEntryState();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    return () => {
      resetLandingEntryState();
    };
  }, []);

  useEffect(() => {
    const previousScrollRestoration =
      "scrollRestoration" in window.history ? window.history.scrollRestoration : null;

    if (previousScrollRestoration !== null) {
      window.history.scrollRestoration = "manual";
    }

    return () => {
      if (previousScrollRestoration !== null) {
        window.history.scrollRestoration = previousScrollRestoration;
      }
    };
  }, []);

  useEffect(() => {
    const computeLandingMode = () => {
      const nextSection = document.getElementById("landing-next-section");
      const startSection = document.querySelector(".landing-start-scene");
      const footerSection = document.querySelector(".landing-footer-scene");
      if (!nextSection) {
        setLandingTransitionProgress(0);
        setLandingMode("hero");
        setLandingTone("light");
        return;
      }

      const nextSectionTop = nextSection.getBoundingClientRect().top;
      const viewportHeight = Math.max(window.innerHeight || 0, 1);
      const transitionStart = viewportHeight * 0.9;
      const transitionEnd = viewportHeight * 0.55;
      const rawProgress =
        (transitionStart - nextSectionTop) / Math.max(transitionStart - transitionEnd, 1);
      const progress = Math.min(1, Math.max(0, rawProgress));

      setLandingTransitionProgress(progress);
      setLandingMode(progress <= 0.001 ? "hero" : progress >= 0.999 ? "compact" : "transition");

      const triggerProbeY = 96;
      const nextTop = nextSection.getBoundingClientRect().top;
      const startTop =
        startSection instanceof HTMLElement ? startSection.getBoundingClientRect().top : Number.POSITIVE_INFINITY;
      const footerTop =
        footerSection instanceof HTMLElement ? footerSection.getBoundingClientRect().top : Number.POSITIVE_INFINITY;

      if (nextTop > triggerProbeY) {
        setLandingTone("light");
        return;
      }

      if (footerTop <= triggerProbeY) {
        setLandingTone("light");
        return;
      }

      if (startTop <= triggerProbeY) {
        setLandingTone("light");
        return;
      }

      setLandingTone("dark");
    };

    computeLandingMode();
    window.addEventListener("scroll", computeLandingMode, { passive: true });
    window.addEventListener("resize", computeLandingMode);

    return () => {
      window.removeEventListener("scroll", computeLandingMode);
      window.removeEventListener("resize", computeLandingMode);
    };
  }, []);

  useEffect(() => {
    const restoreLandingScroll = () => {
      const lockedScrollY = landingOverlayScrollYRef.current;
      delete document.body.dataset.landingLockedScrollY;

      if (lockedScrollY > 0 && Math.abs(window.scrollY - lockedScrollY) > 1) {
        window.scrollTo({ top: lockedScrollY, left: 0, behavior: "auto" });
      }
    };

    if (!landingOverlayOpen) {
      restoreLandingScroll();
      return;
    }

    const lockedScrollY = landingOverlayScrollYRef.current;
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

    return restoreLandingScroll;
  }, [landingOverlayOpen]);

  const handleLandingOverlayOpenChange = (open: boolean) => {
    if (open) {
      landingOverlayScrollYRef.current = window.scrollY;
      document.body.dataset.landingLockedScrollY = String(window.scrollY);
    }

    setLandingOverlayOpen(open);
  };

  return (
    <main className={`landing-home${landingOverlayOpen ? " is-nav-overlay-open" : ""}`} aria-label="EaseMove home">
      <div className="landing-global-nav-shell">
        <AppTopNav
          variant="landing"
          landingMode={landingMode}
          landingTone={landingTone}
          landingTransitionProgress={landingTransitionProgress}
          landingOverlayOpen={landingOverlayOpen}
          onLandingOverlayOpenChange={handleLandingOverlayOpenChange}
        />
      </div>
      <div className="landing-home-stage">
        <HeroSplitScene />
        <HowToUseScene />
        <StartUsingScene />
        <MissionGalleryScene />
        <FooterScene />
      </div>
    </main>
  );
}
