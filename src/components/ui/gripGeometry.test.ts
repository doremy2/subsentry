import { describe, expect, it } from "vitest";
import {
  CARD_RADIUS,
  CORNER_ICON_INSET,
  CORNER_INSIDE,
  cornerIconOffset,
  cornerOffset,
  cornerSize,
  EDGE_INSIDE,
  EDGE_OUTSIDE,
  edgeOffset,
  edgeThickness,
  insideRoundedCorner,
} from "./gripGeometry";
import { WINDOW_MARGIN } from "../../../electron/shared/windowSizes";

describe("resize grip geometry (regression: grips were 6px strips and a corner icon hidden in the clipped corner)", () => {
  it("edge grips reach far enough into the card to be easy to hit, and straddle the edge", () => {
    expect(EDGE_INSIDE).toBeGreaterThanOrEqual(10);
    expect(edgeThickness).toBeGreaterThanOrEqual(16);
    // strip's far edge sits EDGE_OUTSIDE px beyond the card edge, inside the window
    expect(edgeOffset + 0).toBe(WINDOW_MARGIN - EDGE_OUTSIDE);
    expect(edgeOffset).toBeGreaterThanOrEqual(0); // never pokes outside the window
  });

  it("the corner handle is large and stays inside the window", () => {
    expect(cornerSize).toBeGreaterThanOrEqual(32);
    expect(cornerOffset).toBeGreaterThanOrEqual(0);
    expect(CORNER_INSIDE).toBeGreaterThanOrEqual(20);
  });

  it("the corner icon is drawn where the rounded card is actually visible", () => {
    expect(insideRoundedCorner(CORNER_ICON_INSET, CARD_RADIUS)).toBe(true);
    expect(insideRoundedCorner(6, CARD_RADIUS)).toBe(false); // the old position: clipped away
    // the icon's offset from the corner box places it CORNER_ICON_INSET px inside the card edge
    expect(cornerOffset + cornerIconOffset).toBe(WINDOW_MARGIN + CORNER_ICON_INSET);
  });

  it("the rounded-corner rule is sane", () => {
    expect(insideRoundedCorner(0, 28)).toBe(false);
    expect(insideRoundedCorner(28, 28)).toBe(true);
    expect(insideRoundedCorner(9, 28)).toBe(true);
    expect(insideRoundedCorner(8, 28)).toBe(false);
  });
});
