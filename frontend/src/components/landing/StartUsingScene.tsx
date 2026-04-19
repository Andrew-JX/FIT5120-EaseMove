import { navigateTo } from "../../lib/navigation";

export default function StartUsingScene() {
  const openMap = () => navigateTo("/map");

  return (
    <section className="landing-start-scene" aria-label="Start using EaseMove">
      <div className="landing-start-inner">
        <p className="landing-start-kicker">Ready when you are</p>
        <button className="landing-start-title" type="button" onClick={openMap}>
          Start using EaseMove
        </button>
        <p className="landing-start-copy">
          Open the map to compare precincts, adjust comfort preferences, and find support places
          before you head out.
        </p>
        <button className="landing-start-button" type="button" onClick={openMap}>
          Open the map
        </button>
      </div>
    </section>
  );
}
