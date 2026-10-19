import { WINDOW_MARGIN } from "../../../electron/shared/windowSizes";

/**
 * Hit-area geometry of the resize grips, in px, measured from the VISIBLE card edge.
 *
 * Lessons from real use: grips that live entirely inside a rounded, clipped card and are only a few
 * pixels thick are nearly impossible to hit. Each grip therefore (1) reaches well inside the card, which
 * always receives pointer events, and (2) straddles the card edge into the transparent margin.
 */
export const CARD_RADIUS = 28; // keep in sync with `rounded-[28px]` on the cards

/** Edge strips: how far they reach into the card / out into the transparent margin. */
export const EDGE_INSIDE = 12;
export const EDGE_OUTSIDE = 6;
/** The corner handle. */
export const CORNER_INSIDE = 24;
export const CORNER_OUTSIDE = 10;
/** Distance from the card edges to the far end of the corner icon: must lie inside the rounded corner. */
export const CORNER_ICON_INSET = 10;
/** Edge strips stop this far from the card's corners/header so they never fight other controls. */
export const EDGE_START_TOP = 76; // below the header and its drag area
export const EDGE_END_CORNER = 44;

/** Window-relative offsets (px from the window edge) for the CSS `right`/`bottom`/size values. */
export const edgeOffset = WINDOW_MARGIN - EDGE_OUTSIDE;
export const edgeThickness = EDGE_INSIDE + EDGE_OUTSIDE;
export const cornerOffset = WINDOW_MARGIN - CORNER_OUTSIDE;
export const cornerSize = CORNER_INSIDE + CORNER_OUTSIDE;
export const cornerIconOffset = WINDOW_MARGIN + CORNER_ICON_INSET - cornerOffset; // from the corner box edge

/** True if a point `inset` px in from both card edges is visible (not clipped by the rounded corner). */
export function insideRoundedCorner(inset: number, radius = CARD_RADIUS): boolean {
  const d = Math.hypot(radius - inset, radius - inset); // distance from the corner arc's centre
  return inset >= radius || d <= radius;
}
