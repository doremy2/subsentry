use tauri_plugin_sql::{Migration, MigrationKind};

/// Connection string the frontend opens (`Database.load`); keep in sync with
/// `src/data/sqlite/connection.ts`.
pub const DATABASE_URL: &str = "sqlite:subsentry.db";

/// Schema history. Never edit a shipped migration: append a new version instead.
/// Documented in docs/DATA_MODEL.md.
pub fn all() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create subscriptions and preferences",
        sql: "
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
        ",
        kind: MigrationKind::Up,
    }]
}
