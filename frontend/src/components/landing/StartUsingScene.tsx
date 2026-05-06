import { useNavigate } from "react-router";

const bGifUrl = new URL("../../assets/B.gif", import.meta.url).href;
const wGifUrl = new URL("../../assets/W.gif", import.meta.url).href;

export default function StartUsingScene() {
  const navigate = useNavigate();
  const openMap = () => navigate("/map");
  const openCompare = () => navigate("/map/compare");
  const openRisks = () => navigate("/extreme-weather-risks");
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
        <div className="landing-start-actions">
          <button className="landing-start-button" type="button" onClick={openMap}>
            Open the map
          </button>
          <button className="landing-start-button landing-start-button-secondary" type="button" onClick={openCompare}>
            Go to compare
          </button>
          <button className="landing-start-button landing-start-button-secondary" type="button" onClick={openRisks}>
            Check risks
          </button>
        </div>

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
