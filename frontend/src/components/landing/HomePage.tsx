import { useEffect, useLayoutEffect } from "react";
import HeroSplitScene from "./HeroSplitScene";
import HowToUseScene from "./HowToUseScene";
import MissionGalleryScene from "./MissionGalleryScene";
import { resetLandingSceneController } from "./landingSceneController";
import "./landing.css";

export default function HomePage({ entryId }: { entryId: number }) {
  useLayoutEffect(() => {
    resetLandingSceneController();
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [entryId]);

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
      <HeroSplitScene />
      <MissionGalleryScene />
      <HowToUseScene />
    </main>
  );
}
