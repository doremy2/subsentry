import { DatabaseSync } from "node:sqlite";

/**
 * Schema history, applied in order. The database's `PRAGMA user_version` records
 * how many have run. NEVER edit a shipped migration: append a new one.
 * Documented in docs/DATA_MODEL.md.
 */
export const MIGRATIONS: readonly string[] = [
  // v1: subscriptions + preferences
  `
  CREATE TABLE subscriptions (
    id            TEXT PRIMARY KEY NOT NULL,
    merchant      TEXT NOT NULL,
    price_minor   INTEGER NOT NULL CHECK (price_minor >= 0),
    currency      TEXT NOT NULL,
    interval      TEXT NOT NULL CHECK (interval IN ('weekly','monthly','quarterly','yearly')),
    next_renewal  TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('active','paused','cancelled')),
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );
  CREATE INDEX idx_subscriptions_status_renewal ON subscriptions (status, next_renewal);
  CREATE TABLE preferences (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  // v2: remember which renewal occurrences were already reminded (one notification each)
  `
  CREATE TABLE reminder_log (
    subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    renewal_date    TEXT NOT NULL,
    sent_at         TEXT NOT NULL,
    PRIMARY KEY (subscription_id, renewal_date)
  );
  `,
];

export function migrate(db: DatabaseSync): void {
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number } | undefined;
  const current = row?.user_version ?? 0;
  for (let version = current; version < MIGRATIONS.length; version += 1) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[version] as string);
      db.exec(`PRAGMA user_version = ${version + 1}`);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

/** Open (and migrate) a database. Pass ":memory:" in tests. */
export function openDatabase(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  if (path !== ":memory:") db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);
  return db;
}
