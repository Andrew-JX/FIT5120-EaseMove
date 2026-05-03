import { navigateTo } from "../../lib/navigation";

const bGifUrl = new URL("../../assets/B.gif", import.meta.url).href;
const wGifUrl = new URL("../../assets/W.gif", import.meta.url).href;

export default function StartUsingScene() {
  const openMap = () => navigateTo("/map");
  const gifStrip = Array.from({ length: 8 }, (_, index) => ({
    src: index % 2 === 0 ? bGifUrl : wGifUrl,
    key: `gif-${index}`,
  }));
  const marqueeItems = [...gifStrip, ...gifStrip];

  return (
    <section className="landing-start-scene" aria-label="Start using EaseMove">
      <div className="landing-start-inner">
        <p className="landing-start-kicker">Ready when you are</p>
        <button className="landing-start-title" type="button" onClick={openMap}>
          Start using MoveComfortly
        </button>
        <p className="landing-start-copy">
          Open the map to compare precincts, adjust comfort preferences, and find support places
          before you head out.
        </p>
        <button className="landing-start-button" type="button" onClick={openMap}>
          Open the map
        </button>

        <div className="landing-gif-marquee" aria-hidden="true">
          <div className="landing-gif-marquee-track">
            {marqueeItems.map(({ src, key }, index) => (
              <div className="landing-gif-marquee-item" key={`${key}-${index}`}>
                <img src={src} alt="" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
