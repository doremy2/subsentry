import type Database from "@tauri-apps/plugin-sql";
import { todayISO } from "../../domain/dates";
import type { Subscription, SubscriptionInput } from "../../domain/subscription";
import { decodePreferences, encodePreferencePatch } from "../preferencesCodec";
import { buildSeedSubscriptions } from "../seed";
import { DataError, type DataServices, type PreferencesRepository, type SubscriptionRepository } from "../types";
import { openDatabase, wrap } from "./connection";
import { rowToSubscription, SUBSCRIPTION_COLUMNS, type SubscriptionRow } from "./subscriptionMapper";

const SEEDED_KEY = "seeded";

function createSubscriptionRepository(db: Database): SubscriptionRepository {
  async function getById(id: string): Promise<Subscription> {
    const rows = await db.select<SubscriptionRow[]>(`SELECT ${SUBSCRIPTION_COLUMNS} FROM subscriptions WHERE id = $1`, [id]);
    const row = rows[0];
    if (!row) throw new DataError(`Subscription ${id} not found.`);
    return rowToSubscription(row);
  }

  return {
    list: () =>
      wrap("loading subscriptions", db.select<SubscriptionRow[]>(`SELECT ${SUBSCRIPTION_COLUMNS} FROM subscriptions ORDER BY merchant COLLATE NOCASE`).then((rows) => rows.map(rowToSubscription))),

    create: (input: SubscriptionInput) =>
      wrap("saving the subscription", (async () => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await db.execute(
          `INSERT INTO subscriptions (${SUBSCRIPTION_COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [id, input.merchant, input.priceMinor, input.currency, input.interval, input.nextRenewal, input.status, now, now],
        );
        return getById(id);
      })()),

    update: (id, input) =>
      wrap("updating the subscription", (async () => {
        const result = await db.execute(
          `UPDATE subscriptions SET merchant = $1, price_minor = $2, currency = $3, interval = $4,
             next_renewal = $5, status = $6, updated_at = $7 WHERE id = $8`,
          [input.merchant, input.priceMinor, input.currency, input.interval, input.nextRenewal, input.status, new Date().toISOString(), id],
        );
        if (result.rowsAffected === 0) throw new DataError(`Subscription ${id} not found.`);
        return getById(id);
      })()),

    remove: (id) => wrap("deleting the subscription", db.execute("DELETE FROM subscriptions WHERE id = $1", [id]).then(() => undefined)),
  };
}

function createPreferencesRepository(db: Database): PreferencesRepository {
  async function loadRows() {
    return db.select<Array<{ key: string; value: string }>>("SELECT key, value FROM preferences");
  }
  return {
    load: () => wrap("loading preferences", loadRows().then(decodePreferences)),
    save: (patch) =>
      wrap("saving preferences", (async () => {
        for (const { key, value } of encodePreferencePatch(patch)) {
          await db.execute(
            "INSERT INTO preferences (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [key, value],
          );
        }
        return decodePreferences(await loadRows());
      })()),
  };
}

/** Insert the demo subscriptions exactly once, on the very first launch. */
async function seedIfFirstRun(db: Database, subscriptions: SubscriptionRepository): Promise<void> {
  const flag = await db.select<Array<{ value: string }>>("SELECT value FROM preferences WHERE key = $1", [SEEDED_KEY]);
  if (flag.length > 0) return;
  for (const input of buildSeedSubscriptions(todayISO())) await subscriptions.create(input);
  await db.execute("INSERT INTO preferences (key, value) VALUES ($1, 'true')", [SEEDED_KEY]);
}

export async function createSqliteServices(): Promise<DataServices> {
  const db = await openDatabase();
  const subscriptions = createSubscriptionRepository(db);
  await wrap("seeding demo data", seedIfFirstRun(db, subscriptions));
  return { subscriptions, preferences: createPreferencesRepository(db) };
}
