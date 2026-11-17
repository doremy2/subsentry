import type { DatabaseSync } from "node:sqlite";
import { decodePreferences, encodePreferencePatch } from "../../../src/data/preferencesCodec";
import { buildSeedSubscriptions } from "../../../src/data/seed";
import { DataError, type Preferences } from "../../../src/data/types";
import { todayISO } from "../../../src/domain/dates";
import { reminderKey } from "../../../src/domain/reminders";
import type { Subscription, SubscriptionInput } from "../../../src/domain/subscription";
import { isSize, type LayoutKey, type Size } from "../../shared/windowSizes";
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
  /** Keys (`reminderKey`) of renewals already reminded about. */
  getSentReminderKeys(): Set<string>;
  markReminderSent(subscriptionId: string, renewalDate: string): void;
  /** Forget log entries for renewals before `date` (keeps the table small). */
  pruneReminderLog(beforeDate: string): void;
  /** Window size per layout, remembered per device (null = use the default). */
  getWindowSize(deviceId: string, layout: LayoutKey): Size | null;
  setWindowSize(deviceId: string, layout: LayoutKey, size: Size): void;
  /** Forget this device's saved sizes (the "Reset size" button). */
  clearWindowSizes(deviceId: string): void;
  /** Widget position is remembered per device so a synced profile never shares coordinates. */
  getWindowPosition(deviceId: string): WindowPosition | null;
  setWindowPosition(deviceId: string, position: WindowPosition): void;
}

const SEEDED_KEY = "seeded";
const POSITIONS_KEY = "windowPositions";
const SIZES_KEY = "windowSizes";

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

  type SizesByDevice = Record<string, Partial<Record<LayoutKey, Size>>>;
  const readSizes = (): SizesByDevice => {
    try {
      const parsed: unknown = JSON.parse(readPref(SIZES_KEY) ?? "{}");
      return parsed && typeof parsed === "object" ? (parsed as SizesByDevice) : {};
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

    getSentReminderKeys() {
      const rows = db.prepare("SELECT subscription_id, renewal_date FROM reminder_log").all() as Array<{ subscription_id: string; renewal_date: string }>;
      return new Set(rows.map((r) => reminderKey(r.subscription_id, r.renewal_date)));
    },

    markReminderSent(subscriptionId, renewalDate) {
      db.prepare("INSERT OR IGNORE INTO reminder_log (subscription_id, renewal_date, sent_at) VALUES (?, ?, ?)").run(subscriptionId, renewalDate, now().toISOString());
    },

    pruneReminderLog(beforeDate) {
      db.prepare("DELETE FROM reminder_log WHERE renewal_date < ?").run(beforeDate);
    },

    getWindowSize(deviceId, layout) {
      const size = readSizes()[deviceId]?.[layout];
      return isSize(size) ? size : null;
    },

    setWindowSize(deviceId, layout, size) {
      const all = readSizes();
      writePref(SIZES_KEY, JSON.stringify({ ...all, [deviceId]: { ...all[deviceId], [layout]: size } }));
    },

    clearWindowSizes(deviceId) {
      const { [deviceId]: _removed, ...rest } = readSizes();
      writePref(SIZES_KEY, JSON.stringify(rest));
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
