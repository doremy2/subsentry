import { describe, expect, it } from "vitest";
import { decodePreferences, sanitizePreferencePatch } from "./preferencesCodec";
import { createMemoryServices } from "./memory/memoryServices";

describe("decodePreferences", () => {
  it("falls back to defaults on corrupt or out-of-range values", () => {
    const prefs = decodePreferences([
      { key: "opacity", value: "7" },
      { key: "accent", value: '"neon"' },
      { key: "alwaysOnTop", value: "not json" },
    ]);
    expect(prefs.opacity).toBe(1);
    expect(prefs.accent).toBe("indigo");
    expect(prefs.alwaysOnTop).toBe(false);
  });
});

describe("sanitizePreferencePatch", () => {
  it("keeps valid keys, clamps, and drops junk", () => {
    expect(sanitizePreferencePatch({ opacity: 0, accent: "teal", evil: 1, mode: "huge", launchOnLogin: true })).toEqual({
      opacity: 0.4,
      accent: "teal",
      launchOnLogin: true,
    });
    expect(sanitizePreferencePatch(null)).toEqual({});
  });
});

describe("theme and layout preferences", () => {
  it("decodes and sanitizes theme and compactLayout", () => {
    expect(decodePreferences([{ key: "theme", value: '"sunset"' }, { key: "compactLayout", value: '"minimal"' }])).toMatchObject({ theme: "sunset", compactLayout: "minimal" });
    expect(decodePreferences([{ key: "theme", value: '"neon"' }, { key: "compactLayout", value: "3" }])).toMatchObject({ theme: "midnight", compactLayout: "detailed" });
    expect(sanitizePreferencePatch({ theme: "light", compactLayout: "huge" })).toEqual({ theme: "light" });
  });
});

describe("memory services", () => {
  it("supports create, update, remove", async () => {
    const { subscriptions } = createMemoryServices();
    const seeded = await subscriptions.list();
    expect(seeded.length).toBeGreaterThan(5);
    const created = await subscriptions.create({ merchant: "Z", priceMinor: 500, currency: "USD", interval: "weekly", nextRenewal: "2030-01-01", status: "active" });
    const updated = await subscriptions.update(created.id, { ...created, priceMinor: 700 });
    expect(updated.priceMinor).toBe(700);
    await subscriptions.remove(created.id);
    expect((await subscriptions.list()).some((s) => s.id === created.id)).toBe(false);
  });
});
