import HeroSplitScene from "./HeroSplitScene";
import MissionGalleryScene from "./MissionGalleryScene";
import "./landing.css";

export default function HomePage() {
  return (
    <main className="landing-home" aria-label="EaseMove home">
      <HeroSplitScene />
      <MissionGalleryScene />
    </main>
  );
}
