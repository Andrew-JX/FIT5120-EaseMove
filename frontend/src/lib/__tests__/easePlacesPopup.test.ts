import { describe, expect, test } from "vitest";

import { getEasePlacesPopupPositionStyle } from "../easePlacesPopup";

describe("easePlacesPopup positioning", () => {
  test("keeps the popup below the marker when there is enough room", () => {
    const style = getEasePlacesPopupPositionStyle(
      { x: 180, y: 120 },
      { width: 900, height: 700 },
      { width: 300, height: 320 }
    );

    expect(style.top).toBe(130);
    expect(style.left).toBe(180);
    expect(style.transform).toBe("translateX(-50%)");
  });

  test("moves the popup above a low marker near the bottom edge", () => {
    const style = getEasePlacesPopupPositionStyle(
      { x: 240, y: 640 },
      { width: 900, height: 700 },
      { width: 300, height: 320 }
    );

    expect(style.top).toBe(310);
    expect(style.left).toBe(240);
    expect(style.transform).toBe("translateX(-50%)");
  });

  test("clamps the popup horizontally when the marker is too close to the left or right edge", () => {
    const leftStyle = getEasePlacesPopupPositionStyle(
      { x: 30, y: 120 },
      { width: 900, height: 700 },
      { width: 300, height: 320 }
    );
    const rightStyle = getEasePlacesPopupPositionStyle(
      { x: 880, y: 120 },
      { width: 900, height: 700 },
      { width: 300, height: 320 }
    );

    expect(leftStyle.left).toBe(12);
    expect(leftStyle.transform).toBe("none");
    expect(rightStyle.right).toBe(12);
    expect(rightStyle.left).toBe("auto");
    expect(rightStyle.transform).toBe("none");
  });
});
