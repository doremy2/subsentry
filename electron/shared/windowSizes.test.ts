import { describe, expect, it } from "vitest";
import { cardLimits, clampSize, DEFAULT_SIZES, isLayoutKey, layoutKeyFor, MAX_SIZES, MIN_SIZES, parseCustomSize, resizedSize, toCardSize, toWindowSize, WINDOW_MARGIN } from "./windowSizes";

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

describe("custom size input", () => {
  it("converts between visible widget size and window size using the shadow margin", () => {
    expect(toWindowSize({ width: 400, height: 600 })).toEqual({ width: 400 + 2 * WINDOW_MARGIN, height: 600 + 2 * WINDOW_MARGIN });
    expect(toCardSize(toWindowSize({ width: 400, height: 600 }))).toEqual({ width: 400, height: 600 });
  });

  it("reports limits in visible-widget px", () => {
    expect(cardLimits("compact")).toEqual({ min: { width: 320, height: 428 }, max: { width: 528, height: 868 } });
  });

  it("accepts in-range whole numbers and returns the window size", () => {
    expect(parseCustomSize("400", " 600 ", "compact")).toEqual({ ok: true, size: toWindowSize({ width: 400, height: 600 }) });
  });

  it("accepts exactly the minimum and maximum", () => {
    const { min, max } = cardLimits("expanded");
    expect(parseCustomSize(String(min.width), String(min.height), "expanded").ok).toBe(true);
    expect(parseCustomSize(String(max.width), String(max.height), "expanded").ok).toBe(true);
  });

  it("rejects out-of-range values with a message that states the allowed range", () => {
    const r = parseCustomSize("100", "99999", "compact");
    expect(r).toEqual({ ok: false, errors: { width: "Width must be 320\u2013528 px.", height: "Height must be 428\u2013868 px." } });
    const r2 = parseCustomSize("319", "869", "compact");
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.errors).toEqual({ width: "Width must be 320\u2013528 px.", height: "Height must be 428\u2013868 px." });
  });

  it.each(["", "  ", "abc", "40.5", "-400", "4e2", "0x10", "400px"])("rejects %j", (text) => {
    expect(parseCustomSize(text, "600", "compact").ok).toBe(false);
  });

  it("reports both fields at once", () => {
    const r = parseCustomSize("", "", "minimal");
    expect(r).toEqual({ ok: false, errors: { width: "Enter a width.", height: "Enter a height." } });
  });

  it("each layout has its own limits", () => {
    expect(parseCustomSize("330", "300", "minimal").ok).toBe(true);
    expect(parseCustomSize("330", "300", "compact").ok).toBe(false); // too short for the detailed list
  });

  it("recognises layout keys", () => {
    expect(isLayoutKey("minimal")).toBe(true);
    expect(isLayoutKey("huge")).toBe(false);
  });
});
