import type { DatabaseSync } from "node:sqlite";
import { decodePreferences, encodePreferencePatch } from "../../../src/data/preferencesCodec";
import { buildSeedSubscriptions } from "../../../src/data/seed";
import { DataError, type Preferences } from "../../../src/data/types";
import { todayISO } from "../../../src/domain/dates";
import type { Subscription, SubscriptionInput } from "../../../src/domain/subscription";
import { rowToSubscription, SUBSCRIPTION_COLUMNS, type SubscriptionRow } from "./subscriptionMapper";

export interface WindowPosition {
  x: number;
  y: number;
}

/** All persistence for the app. Synchronous (SQLite is local); IPC wraps it in promises. */
export interface Store {
  listSubscriptions(): Subscription[];
  createSubscription(input: SubscriptionInput): Subscription;
  updateSubscription(id: string, input: SubscriptionInput): Subscription;
  removeSubscription(id: string): void;
  loadPreferences(): Preferences;
  savePreferences(patch: Partial<Preferences>): Preferences;
  /** Widget position is remembered per device so a synced profile never shares coordinates. */
  getWindowPosition(deviceId: string): WindowPosition | null;
  setWindowPosition(deviceId: string, position: WindowPosition): void;
}

const SEEDED_KEY = "seeded";
const POSITIONS_KEY = "windowPositions";

export function createStore(db: DatabaseSync, now: () => Date = () => new Date()): Store {
  const getById = (id: string): Subscription => {
    const row = db.prepare(`SELECT ${SUBSCRIPTION_COLUMNS} FROM subscriptions WHERE id = ?`).get(id) as SubscriptionRow | undefined;
    if (!row) throw new DataError(`Subscription ${id} not found.`);
    return rowToSubscription(row);
  };

  const readPref = (key: string): string | undefined =>
    (db.prepare("SELECT value FROM preferences WHERE key = ?").get(key) as { value: string } | undefined)?.value;
  const writePref = (key: string, value: string) =>
    db.prepare("INSERT INTO preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);

  const readPositions = (): Record<string, WindowPosition> => {
    try {
      const parsed: unknown = JSON.parse(readPref(POSITIONS_KEY) ?? "{}");
      return parsed && typeof parsed === "object" ? (parsed as Record<string, WindowPosition>) : {};
    } catch {
      return {};
    }
  };

  const store: Store = {
    listSubscriptions: () =>
      (db.prepare(`SELECT ${SUBSCRIPTION_COLUMNS} FROM subscriptions ORDER BY merchant COLLATE NOCASE`).all() as SubscriptionRow[]).map(rowToSubscription),

    createSubscription(input) {
      const id = crypto.randomUUID();
      const stamp = now().toISOString();
      db.prepare(`INSERT INTO subscriptions (${SUBSCRIPTION_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        id, input.merchant, input.priceMinor, input.currency, input.interval, input.nextRenewal, input.status, stamp, stamp,
      );
      return getById(id);
    },

    updateSubscription(id, input) {
      const result = db
        .prepare("UPDATE subscriptions SET merchant = ?, price_minor = ?, currency = ?, interval = ?, next_renewal = ?, status = ?, updated_at = ? WHERE id = ?")
        .run(input.merchant, input.priceMinor, input.currency, input.interval, input.nextRenewal, input.status, now().toISOString(), id);
      if (result.changes === 0) throw new DataError(`Subscription ${id} not found.`);
      return getById(id);
    },

    removeSubscription(id) {
      db.prepare("DELETE FROM subscriptions WHERE id = ?").run(id);
    },

    loadPreferences: () => decodePreferences(db.prepare("SELECT key, value FROM preferences").all() as Array<{ key: string; value: string }>),

    savePreferences(patch) {
      for (const { key, value } of encodePreferencePatch(patch)) writePref(key, value);
      return store.loadPreferences();
    },

    getWindowPosition(deviceId) {
      const pos = readPositions()[deviceId];
      return pos && Number.isFinite(pos.x) && Number.isFinite(pos.y) ? pos : null;
    },

    setWindowPosition(deviceId, position) {
      writePref(POSITIONS_KEY, JSON.stringify({ ...readPositions(), [deviceId]: position }));
    },
  };

  // First launch only: insert the demo subscriptions once.
  if (readPref(SEEDED_KEY) === undefined) {
    for (const input of buildSeedSubscriptions(todayISO(now()))) store.createSubscription(input);
    writePref(SEEDED_KEY, "true");
  }

  return store;
}
