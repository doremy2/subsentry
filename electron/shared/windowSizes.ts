import type { CompactLayout, WidgetMode } from "../../src/data/types";

/**
 * Window geometry rules shared by the main process (which resizes the window) and
 * the renderer (which adapts its content). All values are DIPs and INCLUDE 16px of
 * transparent margin per side that hosts the card's CSS shadow.
 */

/** Transparent margin around the visible card that hosts its shadow (and the outer part of the resize grips), px. */
export const WINDOW_MARGIN = 16;

export interface Size {
  width: number;
  height: number;
}

/** Each layout remembers its own size: compact list, compact minimal, and the expanded manager. */
export type LayoutKey = "compact" | "minimal" | "expanded";

export const DEFAULT_SIZES: Record<LayoutKey, Size> = {
  compact: { width: 392, height: 548 },
  minimal: { width: 392, height: 320 },
  expanded: { width: 1012, height: 692 },
};

/** Smallest sizes at which the content still lays out without clipping. */
export const MIN_SIZES: Record<LayoutKey, Size> = {
  compact: { width: 352, height: 460 },
  minimal: { width: 352, height: 296 },
  expanded: { width: 820, height: 560 },
};

export const MAX_SIZES: Record<LayoutKey, Size> = {
  compact: { width: 560, height: 900 },
  minimal: { width: 560, height: 420 },
  expanded: { width: 1600, height: 1100 },
};

export function layoutKeyFor(mode: WidgetMode, compactLayout: CompactLayout): LayoutKey {
  return mode === "expanded" ? "expanded" : compactLayout === "minimal" ? "minimal" : "compact";
}

/** Clamp to [min, min(max, available screen area)]. The minimum always wins on tiny screens. */
export function clampSize(key: LayoutKey, size: Size, available?: Size): Size {
  const min = MIN_SIZES[key];
  const max = MAX_SIZES[key];
  const limit = (cap: number, avail: number | undefined, floor: number) => Math.max(floor, Math.min(cap, avail ?? cap));
  return {
    width: Math.round(Math.min(Math.max(size.width, min.width), limit(max.width, available?.width, min.width))),
    height: Math.round(Math.min(Math.max(size.height, min.height), limit(max.height, available?.height, min.height))),
  };
}

export type ResizeAxis = "both" | "x" | "y";

/** New size after the cursor moved by (dx, dy) from where the drag started. Pure, so it can be tested. */
export function resizedSize(start: Size, delta: { dx: number; dy: number }, axis: ResizeAxis, key: LayoutKey, available?: Size): Size {
  return clampSize(
    key,
    {
      width: axis === "y" ? start.width : start.width + delta.dx,
      height: axis === "x" ? start.height : start.height + delta.dy,
    },
    available,
  );
}

export function isSize(value: unknown): value is Size {
  const v = value as Partial<Size> | null;
  return !!v && typeof v === "object" && Number.isFinite(v.width) && Number.isFinite(v.height);
}

/* ---- Custom size (Settings): users think in the VISIBLE widget size, not the window with its shadow margin ---- */

export const toCardSize = (windowSize: Size): Size => ({ width: windowSize.width - 2 * WINDOW_MARGIN, height: windowSize.height - 2 * WINDOW_MARGIN });
export const toWindowSize = (cardSize: Size): Size => ({ width: cardSize.width + 2 * WINDOW_MARGIN, height: cardSize.height + 2 * WINDOW_MARGIN });

/** Allowed visible-widget sizes for a layout, in px. */
export function cardLimits(key: LayoutKey): { min: Size; max: Size } {
  return { min: toCardSize(MIN_SIZES[key]), max: toCardSize(MAX_SIZES[key]) };
}

export type CustomSizeResult = { ok: true; size: Size } | { ok: false; errors: { width?: string; height?: string } };

/**
 * Validate typed width/height (visible widget size, px) for a layout. Returns the WINDOW size to apply.
 * Whole numbers only; out-of-range values are rejected with a message, never silently changed.
 */
export function parseCustomSize(widthText: string, heightText: string, key: LayoutKey): CustomSizeResult {
  const { min, max } = cardLimits(key);
  const errors: { width?: string; height?: string } = {};

  /** The number if valid; otherwise records a message under `field` and returns null. */
  const read = (field: "width" | "height", text: string, lo: number, hi: number): number | null => {
    const label = field === "width" ? "Width" : "Height";
    const trimmed = text.trim();
    if (trimmed === "") errors[field] = `Enter a ${field}.`;
    else if (!/^\d{1,5}$/.test(trimmed)) errors[field] = "Use a whole number, e.g. 400.";
    else if (Number(trimmed) < lo || Number(trimmed) > hi) errors[field] = `${label} must be ${lo}\u2013${hi} px.`;
    else return Number(trimmed);
    return null;
  };

  const width = read("width", widthText, min.width, max.width);
  const height = read("height", heightText, min.height, max.height);
  if (width === null || height === null) return { ok: false, errors };
  return { ok: true, size: toWindowSize({ width, height }) };
}

export const LAYOUT_KEYS = ["compact", "minimal", "expanded"] as const;
export const isLayoutKey = (value: unknown): value is LayoutKey => (LAYOUT_KEYS as readonly unknown[]).includes(value);
