import { ChevronDown, ChevronUp, Snowflake, Tag, X, ZoomIn } from "lucide-react";
import { useMemo, useState } from "react";

import { type EasePlacesFeature } from "../../lib/easePlaces";
import { getEasePlacesPopupPositionStyle } from "../../lib/easePlacesPopup";

const POPUP_SIZE = { width: 300, height: 320 };

function cpDotClass(category: string): string {
  if (category.includes("Arts")) return "cp-dot cp-dot-arts";
  if (category.includes("Recreation")) return "cp-dot cp-dot-recreation";
  if (category.includes("Food") || category.includes("Dining")) return "cp-dot cp-dot-food";
  return "cp-dot cp-dot-shopping";
}

export default function EasePlacesDetailPopup({
  feature,
  anchorPoint,
  viewport,
  onClose,
  onZoomTo,
}: {
  feature: EasePlacesFeature;
  anchorPoint: { x: number; y: number };
  viewport: { width: number; height: number };
  onClose: () => void;
  onZoomTo?: (feature: EasePlacesFeature) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const popupStyle = useMemo(
    () => getEasePlacesPopupPositionStyle(anchorPoint, viewport, POPUP_SIZE),
    [anchorPoint, viewport]
  );

  return (
    <div className="ease-places-popup" style={popupStyle}>
      <div className="cpp-header">
        <span className="cpp-header-title">Ease Places</span>
        <div className="cpp-header-actions">
          {onZoomTo ? (
            <button className="cpp-icon-btn" title="Zoom to location" onClick={() => onZoomTo(feature)}>
              <ZoomIn size={13} />
            </button>
          ) : null}
          <button className="cpp-icon-btn" title={collapsed ? "Expand" : "Collapse"} onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
          <button className="cpp-icon-btn" title="Close" onClick={onClose}>
            <X size={13} />
          </button>
        </div>
      </div>

      {!collapsed ? (
        <div className="cpp-body">
          <div className="cpp-category-row">
            <div className={cpDotClass(feature.category)} />
            <span className="cpp-category-name">{feature.category}</span>
          </div>
          <p className="cpp-sub-type">{feature.type}</p>
          <p className="cpp-place-name">{feature.name}</p>

          <div className="cpp-feature-icons">
            {feature.airConditioned ? (
              <div className="cpp-feature-btn">
                <Snowflake size={16} />
                <span className="cpp-tip">Air-conditioned</span>
              </div>
            ) : null}
            {feature.freeEntry ? (
              <div className="cpp-feature-btn">
                <Tag size={14} />
                <span className="cpp-tip">Free Entry</span>
              </div>
            ) : null}
          </div>

          <div className="cpp-details">
            <div className="cpp-detail-row">
              <span className="cpp-detail-label">Address</span>
              <span className="cpp-detail-value">{feature.address}</span>
            </div>
            <div className="cpp-detail-row">
              <span className="cpp-detail-label">Opening Hours</span>
              <span className="cpp-detail-value">{feature.operatingHours}</span>
            </div>
            {feature.reviewSource ? (
              <div className="cpp-detail-row">
                <span className="cpp-detail-label">Recommended by</span>
                <span className="cpp-detail-value">{feature.reviewSource}</span>
              </div>
            ) : null}
            {feature.reviewNote ? (
              <div className="cpp-detail-row">
                <span className="cpp-detail-label">Why it stands out</span>
                <span className="cpp-detail-value">{feature.reviewNote}</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
