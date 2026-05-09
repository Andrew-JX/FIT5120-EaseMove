import { useEffect, useLayoutEffect } from "react";
import AppTopNav from "../AppTopNav";
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
}

export default function HomePage() {
  const scrollTop = () => window.scrollTo({ top: 0, left: 0, behavior: "smooth" });

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

  return (
    <main className="landing-home" aria-label="EaseMove home">
      <div className="landing-global-nav-shell">
        <AppTopNav variant="landing" onBackToTop={scrollTop} />
      </div>
      <HeroSplitScene />
      <HowToUseScene />
      <StartUsingScene />
      <MissionGalleryScene />
      <FooterScene />
    </main>
  );
}
