import { describe, expect, it } from "vitest";
import { decodePreferences } from "./preferencesCodec";
import { rowToSubscription } from "./sqlite/subscriptionMapper";
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

describe("rowToSubscription", () => {
  const row = { id: "a", merchant: "X", price_minor: 100, currency: "USD", interval: "monthly", next_renewal: "2025-01-01", status: "active", created_at: "t", updated_at: "t" };
  it("maps a valid row", () => expect(rowToSubscription(row).priceMinor).toBe(100));
  it("rejects corrupt rows", () => {
    expect(() => rowToSubscription({ ...row, interval: "daily" })).toThrow();
    expect(() => rowToSubscription({ ...row, price_minor: "1" })).toThrow();
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
