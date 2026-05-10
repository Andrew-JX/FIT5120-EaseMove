type MapFilters = {
  easePlaces: boolean;
  comfortArea: boolean;
  streetFacilities: boolean;
  naturalPlaces: boolean;
};

function FurnitureLegend() {
  return (
    <>
      <div className="legend-section-label">Street Furniture</div>
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
            <div className="legend-row">
              <div className="cp-dot cp-dot-arts" />
              <span>Arts, Culture &amp; Enrichment</span>
            </div>
            <div className="legend-row">
              <div className="cp-dot cp-dot-recreation" />
              <span>Recreation / Leisure &amp; Open Spaces</span>
            </div>
            <div className="legend-row">
              <div className="cp-dot cp-dot-shopping" />
              <span>Shopping</span>
            </div>
            <div className="legend-row">
              <div className="cp-dot cp-dot-food" />
              <span>Food &amp; Dining</span>
            </div>
          </>
        ) : null}

        {filters.naturalPlaces ? (
          <>
            {showDividerBefore("naturalPlaces") ? <div className="legend-divider" /> : null}
            <div className="legend-section-label">Natural Places</div>
            <div className="legend-row">
              <div className="h-3 w-3 border-2 border-blue-900 bg-blue-200" />
              <span>Waterbody</span>
            </div>
            <div className="legend-row">
              <div className="h-3 w-3 border-2 border-green-900 bg-green-300" />
              <span>Park</span>
            </div>
          </>
        ) : null}

        {filters.comfortArea ? (
          <>
            {showDividerBefore("comfortArea") ? <div className="legend-divider" /> : null}
            <div className="legend-section-label">Comfort Level</div>
            <div className="legend-row">
              <div className="comfort-dot comfort-dot-comfortable" />
              <span>Comfortable (70-100)</span>
            </div>
            <div className="legend-row">
              <div className="comfort-dot comfort-dot-caution" />
              <span>Caution (40-69)</span>
            </div>
            <div className="legend-row">
              <div className="comfort-dot comfort-dot-high" />
              <span>High Risk (0-39)</span>
            </div>
            <div className="legend-row">
              <div className="comfort-dot comfort-dot-no-data" />
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
