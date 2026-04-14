import L from 'leaflet'

const MARKER_COLOURS = {
  Comfortable: '#22c55e',
  Caution: '#eab308',
  'High Risk': '#ef4444'
}

const STALE_COLOUR = '#9ca3af'

/**
 * Creates a Leaflet DivIcon for a precinct comfort marker.
 * @param {Object} precinct - Precinct score object from the API.
 * @returns {L.DivIcon} Leaflet marker icon.
 */
export function createPrecinctMarkerIcon(precinct) {
  const colour = precinct.stale_data ? STALE_COLOUR : MARKER_COLOURS[precinct.comfort_label] || STALE_COLOUR
  const label = precinct.stale_data ? `${precinct.comfort_label} !` : precinct.comfort_label

  return L.divIcon({
    className: 'precinct-marker',
    html: `
      <div style="
        min-width: 36px;
        min-height: 36px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        color: #111827;
        font: 700 14px/1.2 Inter, system-ui, sans-serif;
        text-align: center;
        white-space: nowrap;
      ">
        <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="13" fill="${colour}" stroke="#ffffff" stroke-width="4"></circle>
          ${precinct.stale_data ? '<text x="18" y="23" text-anchor="middle" fill="#ffffff" font-size="18" font-weight="800">!</text>' : ''}
        </svg>
        <span style="
          display: inline-block;
          min-width: 36px;
          padding: 2px 6px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.18);
        ">${label}</span>
      </div>
    `,
    iconSize: [96, 56],
    iconAnchor: [48, 18]
  })
}
