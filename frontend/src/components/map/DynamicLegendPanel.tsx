type MapFilters = {
  easePlaces: boolean;
  comfortArea: boolean;
  streetFacilities: boolean;
  naturalPlaces: boolean;
};

function easePlaceMarkerColor(categoryKey: "arts" | "recreation" | "shopping" | "food"): { core: string; halo: string } {
  if (categoryKey === "arts") return { core: "#5b5b9b", halo: "rgba(91,91,155,0.3)" };
  if (categoryKey === "recreation") return { core: "#00a859", halo: "rgba(0,168,89,0.3)" };
  if (categoryKey === "food") return { core: "#dd6b20", halo: "rgba(221,107,32,0.3)" };
  return { core: "#e197b9", halo: "rgba(225,151,185,0.3)" };
}

function EasePlaceLegendMarker({
  categoryKey,
}: {
  categoryKey: "arts" | "recreation" | "shopping" | "food";
}) {
  const { core, halo } = easePlaceMarkerColor(categoryKey);
  return (
    <span
      aria-hidden="true"
      className="mt-1 inline-block h-[14px] w-[14px] shrink-0 rounded-full"
      style={{ background: core, boxShadow: `0 0 0 6px ${halo}` }}
    />
  );
}

function ComfortMarkerLegend({
  color,
  score,
}: {
  color: string;
  score: string;
}) {
  return (
    <div className="legend-comfort-marker" aria-hidden="true">
      <div className="legend-comfort-score" style={{ borderColor: color }}>
        {score}
      </div>
      <div className="legend-comfort-pin" style={{ background: color }}>
        <span className="legend-comfort-pin-inner" />
      </div>
    </div>
  );
}

function FurnitureLegend() {
  return (
    <>
      <div className="legend-section-label">Street Facilities</div>
      <div className="legend-row">
        <div className="furniture-dot furniture-dot-drinking" />
        <span>Drinking Fountain</span>
      </div>
      <div className="legend-row">
        <div className="furniture-dot furniture-dot-bike" />
        <span>Bicycle Rack</span>
      </div>
      <div className="legend-row">
        <div className="furniture-dot furniture-dot-seat" />
        <span>Seat</span>
      </div>
    </>
  );
}

export default function DynamicLegendPanel({
  filters,
}: {
  filters: MapFilters;
}) {
  const sections = [
    filters.easePlaces ? "easePlaces" : null,
    filters.naturalPlaces ? "naturalPlaces" : null,
    filters.comfortArea ? "comfortArea" : null,
    filters.streetFacilities ? "streetFacilities" : null,
  ].filter(Boolean);

  const showDividerBefore = (section: string) => sections[0] !== section;

  return (
    <div className="map-right-panel">
      <div className="map-panel-header">Legend</div>
      <div className="legend-body legend-body-scrollable" data-testid="dynamic-legend-body">
        {filters.easePlaces ? (
          <>
            <div className="legend-section-label">Ease Places</div>
            <div className="legend-row legend-ease-row">
              <EasePlaceLegendMarker categoryKey="arts" />
              <span className="legend-ease-label">Arts, Culture &amp; Enrichment</span>
            </div>
            <div className="legend-row legend-ease-row">
              <EasePlaceLegendMarker categoryKey="recreation" />
              <span className="legend-ease-label">Recreation / Leisure &amp; Open Spaces</span>
            </div>
            <div className="legend-row legend-ease-row">
              <EasePlaceLegendMarker categoryKey="shopping" />
              <span className="legend-ease-label">Shopping</span>
            </div>
            <div className="legend-row legend-ease-row">
              <EasePlaceLegendMarker categoryKey="food" />
              <span className="legend-ease-label">Food &amp; Dining</span>
            </div>
          </>
        ) : null}

        {filters.naturalPlaces ? (
          <>
            {showDividerBefore("naturalPlaces") ? <div className="legend-divider" /> : null}
            <div className="legend-section-label">Natural Places</div>
            <div className="legend-row">
              <div className="legend-natural-swatch legend-natural-water" />
              <span>Waterbody</span>
            </div>
            <div className="legend-row">
              <div className="legend-natural-swatch legend-natural-park" />
              <span>Park</span>
            </div>
          </>
        ) : null}

        {filters.comfortArea ? (
          <>
            {showDividerBefore("comfortArea") ? <div className="legend-divider" /> : null}
            <div className="legend-section-label">Comfort Level</div>
            <div className="legend-row">
              <ComfortMarkerLegend color="#22c55e" score="82" />
              <span>Comfortable (70-100)</span>
            </div>
            <div className="legend-row">
              <ComfortMarkerLegend color="#eab308" score="56" />
              <span>Caution (40-69)</span>
            </div>
            <div className="legend-row">
              <ComfortMarkerLegend color="#ef4444" score="24" />
              <span>High Risk (0-39)</span>
            </div>
            <div className="legend-row">
              <ComfortMarkerLegend color="#9ca3af" score="--" />
              <span>No sensor data</span>
            </div>
          </>
        ) : null}

        {filters.streetFacilities ? (
          <>
            {showDividerBefore("streetFacilities") ? <div className="legend-divider" /> : null}
            <FurnitureLegend />
          </>
        ) : null}
      </div>
    </div>
  );
}
