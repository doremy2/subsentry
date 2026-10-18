import { describe, expect, it } from "vitest";
import { EMPTY_PLACEMENT, originOnCollapse, rememberAfterExpand, rememberBeforeExpand } from "./windowPlacement";

describe("expand / collapse placement", () => {
  const compact = { x: 1184, y: 24 }; // default top-right position
  const expandedAt = { x: 588, y: 24 }; // slid left to fit

  it("returns to the original compact position after expanding and collapsing", () => {
    const memory = rememberAfterExpand(rememberBeforeExpand(compact), expandedAt);
    expect(originOnCollapse(expandedAt, memory)).toEqual(compact);
  });

  it("tolerates a pixel or two of rounding drift", () => {
    const memory = rememberAfterExpand(rememberBeforeExpand(compact), expandedAt);
    expect(originOnCollapse({ x: 589, y: 23 }, memory)).toEqual(compact);
  });

  it("keeps the new spot when the user moved the expanded window", () => {
    const memory = rememberAfterExpand(rememberBeforeExpand(compact), expandedAt);
    const moved = { x: 300, y: 200 };
    expect(originOnCollapse(moved, memory)).toEqual(moved);
  });

  it("does nothing when there is nothing remembered (e.g. app restarted while expanded)", () => {
    expect(originOnCollapse({ x: 10, y: 20 }, EMPTY_PLACEMENT)).toEqual({ x: 10, y: 20 });
  });

  it("does not restore when the window never needed to move (same spot, harmless)", () => {
    const memory = rememberAfterExpand(rememberBeforeExpand(compact), compact);
    expect(originOnCollapse(compact, memory)).toEqual(compact);
  });

  it("does not restore if expanding was never completed", () => {
    expect(originOnCollapse(expandedAt, rememberBeforeExpand(compact))).toEqual(expandedAt);
  });
});
