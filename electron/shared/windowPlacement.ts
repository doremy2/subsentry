/**
 * Where the widget goes when it is expanded and collapsed again.
 *
 * Expanding may have to slide the window left/up so the bigger window fits on screen. On collapse we
 * want the widget back where it was, unless the user deliberately moved the window while it was
 * expanded (then it stays where they put it). Pure so every case can be unit-tested.
 */

export interface Point {
  x: number;
  y: number;
}

export interface PlacementMemory {
  /** Where the compact widget sat before it was expanded. */
  compactOrigin: Point | null;
  /** Where the expanded window ended up right after expanding (after any slide to fit on screen). */
  expandedAuto: Point | null;
}

export const EMPTY_PLACEMENT: PlacementMemory = { compactOrigin: null, expandedAuto: null };

/** Rounding between DIPs and device pixels can shift a position by a pixel or two. */
const TOLERANCE_PX = 2;

const near = (a: Point, b: Point) => Math.abs(a.x - b.x) <= TOLERANCE_PX && Math.abs(a.y - b.y) <= TOLERANCE_PX;

/** Call just before expanding, with the compact window's current position. */
export function rememberBeforeExpand(current: Point): PlacementMemory {
  return { compactOrigin: current, expandedAuto: null };
}

/** Call right after the expanded window was placed on screen. */
export function rememberAfterExpand(memory: PlacementMemory, placed: Point): PlacementMemory {
  return { ...memory, expandedAuto: placed };
}

/**
 * Top-left corner to use when collapsing. Restores the remembered compact position only if the
 * window is still where expanding put it; otherwise keeps `current` (the user moved it).
 */
export function originOnCollapse(current: Point, memory: PlacementMemory): Point {
  return memory.compactOrigin && memory.expandedAuto && near(current, memory.expandedAuto) ? memory.compactOrigin : current;
}
