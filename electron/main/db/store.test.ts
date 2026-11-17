import { describe, expect, it } from "vitest";
import { openDatabase, MIGRATIONS } from "./database";
import { createStore } from "./store";

const sample = { merchant: "Test", priceMinor: 999, currency: "USD", interval: "monthly" as const, nextRenewal: "2030-01-01", status: "active" as const };

describe("sqlite store", () => {
  it("migrates and seeds demo data exactly once", () => {
    const db = openDatabase(":memory:");
    const first = createStore(db).listSubscriptions().length;
    expect(first).toBeGreaterThan(5);
    expect(createStore(db).listSubscriptions()).toHaveLength(first); // reopening must not re-seed
    expect((db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version).toBe(MIGRATIONS.length);
  });

  it("creates, updates and deletes subscriptions", () => {
    const store = createStore(openDatabase(":memory:"));
    const created = store.createSubscription(sample);
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    const updated = store.updateSubscription(created.id, { ...sample, priceMinor: 1500, status: "paused" });
    expect(updated).toMatchObject({ priceMinor: 1500, status: "paused", id: created.id });
    store.removeSubscription(created.id);
    expect(store.listSubscriptions().some((s) => s.id === created.id)).toBe(false);
    expect(() => store.updateSubscription("missing", sample)).toThrow(/not found/);
  });

  it("enforces schema constraints", () => {
    const store = createStore(openDatabase(":memory:"));
    expect(() => store.createSubscription({ ...sample, interval: "daily" as never })).toThrow();
  });

  it("persists preferences and per-device window positions separately", () => {
    const store = createStore(openDatabase(":memory:"));
    expect(store.savePreferences({ accent: "rose", alwaysOnTop: true })).toMatchObject({ accent: "rose", alwaysOnTop: true, mode: "compact" });
    store.setWindowPosition("mac-device", { x: 10, y: 20 });
    store.setWindowPosition("win-device", { x: 300, y: 400 });
    expect(store.getWindowPosition("mac-device")).toEqual({ x: 10, y: 20 });
    expect(store.getWindowPosition("win-device")).toEqual({ x: 300, y: 400 });
    expect(store.getWindowPosition("other")).toBeNull();
  });

  it("remembers window sizes per device and per layout, and can reset them", () => {
    const store = createStore(openDatabase(":memory:"));
    expect(store.getWindowSize("mac", "compact")).toBeNull();
    store.setWindowSize("mac", "compact", { width: 420, height: 600 });
    store.setWindowSize("mac", "expanded", { width: 1100, height: 700 });
    store.setWindowSize("win", "compact", { width: 380, height: 500 });
    expect(store.getWindowSize("mac", "compact")).toEqual({ width: 420, height: 600 });
    expect(store.getWindowSize("mac", "expanded")).toEqual({ width: 1100, height: 700 });
    expect(store.getWindowSize("mac", "minimal")).toBeNull();
    expect(store.getWindowSize("win", "compact")).toEqual({ width: 380, height: 500 });
    store.clearWindowSizes("mac");
    expect(store.getWindowSize("mac", "compact")).toBeNull();
    expect(store.getWindowSize("win", "compact")).toEqual({ width: 380, height: 500 }); // other device untouched
  });

  it("persists theme and compact layout preferences", () => {
    const store = createStore(openDatabase(":memory:"));
    expect(store.loadPreferences()).toMatchObject({ theme: "midnight", compactLayout: "detailed" });
    expect(store.savePreferences({ theme: "aurora", compactLayout: "minimal" })).toMatchObject({ theme: "aurora", compactLayout: "minimal" });
  });
});
