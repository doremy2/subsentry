import { describe, expect, it } from "vitest";
import { clampSize, DEFAULT_SIZES, layoutKeyFor, MAX_SIZES, MIN_SIZES, resizedSize } from "./windowSizes";

describe("window size rules", () => {
  it("picks the layout key from mode and compact layout", () => {
    expect(layoutKeyFor("expanded", "minimal")).toBe("expanded");
    expect(layoutKeyFor("compact", "minimal")).toBe("minimal");
    expect(layoutKeyFor("compact", "detailed")).toBe("compact");
  });

  it("defaults sit inside the allowed range for every layout", () => {
    for (const key of ["compact", "minimal", "expanded"] as const) {
      expect(clampSize(key, DEFAULT_SIZES[key])).toEqual(DEFAULT_SIZES[key]);
    }
  });

  it("enforces minimum and maximum sizes", () => {
    expect(clampSize("compact", { width: 10, height: 10 })).toEqual(MIN_SIZES.compact);
    expect(clampSize("compact", { width: 9999, height: 9999 })).toEqual(MAX_SIZES.compact);
  });

  it("never exceeds the screen, but the minimum always wins on tiny screens", () => {
    expect(clampSize("expanded", { width: 1500, height: 1000 }, { width: 1280, height: 720 })).toEqual({ width: 1280, height: 720 });
    expect(clampSize("expanded", { width: 1500, height: 1000 }, { width: 600, height: 400 })).toEqual(MIN_SIZES.expanded);
  });

  it("resizes by the cursor delta along the chosen axis only", () => {
    const start = { width: 400, height: 500 };
    expect(resizedSize(start, { dx: 40, dy: 60 }, "both", "compact")).toEqual({ width: 440, height: 560 });
    expect(resizedSize(start, { dx: 40, dy: 60 }, "x", "compact")).toEqual({ width: 440, height: 500 });
    expect(resizedSize(start, { dx: 40, dy: 60 }, "y", "compact")).toEqual({ width: 400, height: 560 });
    expect(resizedSize(start, { dx: -500, dy: -500 }, "both", "compact")).toEqual(MIN_SIZES.compact); // shrinking stops at the minimum
  });
});
