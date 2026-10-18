import type { WidgetMode } from "../../src/data/types";

/**
 * Window size per mode, in DIPs. Includes 16px of transparent margin per side
 * so the card's CSS shadow is never clipped.
 */
export const WINDOW_SIZES: Record<WidgetMode, { width: number; height: number }> = {
  compact: { width: 392, height: 548 },
  expanded: { width: 1012, height: 692 },
};
