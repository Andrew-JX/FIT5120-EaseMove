type Point = {
  x: number;
  y: number;
};

type Size = {
  width: number;
  height: number;
};

type PopupStyle = {
  top: number;
  left: number | "auto";
  right?: number;
  transform: string;
};

const EDGE_MARGIN = 12;
const GAP = 10;

export function getEasePlacesPopupPositionStyle(
  anchorPoint: Point,
  viewport: Size,
  popupSize: Size
): PopupStyle {
  const fitsBelow = anchorPoint.y + GAP + popupSize.height <= viewport.height - EDGE_MARGIN;
  const top = fitsBelow
    ? anchorPoint.y + GAP
    : Math.max(EDGE_MARGIN, anchorPoint.y - popupSize.height - GAP);

  const halfWidth = popupSize.width / 2;
  if (anchorPoint.x - halfWidth < EDGE_MARGIN) {
    return {
      top,
      left: EDGE_MARGIN,
      transform: "none",
    };
  }

  if (anchorPoint.x + halfWidth > viewport.width - EDGE_MARGIN) {
    return {
      top,
      left: "auto",
      right: EDGE_MARGIN,
      transform: "none",
    };
  }

  return {
    top,
    left: anchorPoint.x,
    transform: "translateX(-50%)",
  };
}
