# Data model

Source of truth: `src/domain/subscription.ts` (TypeScript) and `electron/main/db/database.ts` (SQLite migrations). Keep them and this doc in sync.

Storage: `subsentry.db` in Electron's `userData` folder, opened by the main process with `node:sqlite` (WAL mode). Schema version = `PRAGMA user_version`.

## Subscription

| Field | TS type | SQLite column | Notes |
|---|---|---|---|
| `id` | `string` | `id TEXT PRIMARY KEY` | UUID v4, generated once, never reused |
| `merchant` | `string` | `merchant TEXT` | 1-60 chars, trimmed |
| `priceMinor` | `number` | `price_minor INTEGER` | Minor units (cents). 1549 = $15.49. JPY has 0 decimals |
| `currency` | `string` | `currency TEXT` | ISO 4217, see `SUPPORTED_CURRENCIES` |
| `interval` | `weekly \| monthly \| quarterly \| yearly` | `interval TEXT` (CHECK) | Billing cycle |
| `nextRenewal` | `ISODate` | `next_renewal TEXT` | `YYYY-MM-DD`, no time zone. May be in the past; the UI rolls it forward with `nextOccurrence` |
| `status` | `active \| paused \| cancelled` | `status TEXT` (CHECK) | Only `active` counts toward totals |
| `createdAt` / `updatedAt` | `string` | `created_at` / `updated_at` | ISO 8601 UTC |

## Preferences

Key/value table: `preferences(key TEXT PRIMARY KEY, value TEXT)`, values are JSON.
Keys: `accent`, `opacity` (0.4-1), `alwaysOnTop`, `mode` (`compact|expanded`), `launchOnLogin`, `remindersEnabled` (default true), `reminderLeadDays` (0-30, default 3), `reminderHour` (0-23, default 9), `seeded` (demo data inserted once), `windowPositions` (`{ [deviceId]: {x,y} }` in screen DIPs; `deviceId` = hash of host + user + OS, so positions never leak between machines).
Decoding is defensive (`src/data/preferencesCodec.ts`): bad values fall back to defaults. Patches from the renderer are whitelisted with `sanitizePreferencePatch`.

## Rules
- Totals are per currency; there is no FX conversion.
- Monthly equivalent = price x periods per year / 12 (weekly uses 52).
- Schema changes: append a new migration to `MIGRATIONS`; never edit a shipped one.
- The main process re-validates every subscription with `parseSubscriptionInput`.

## Reminder log (migration v2)
`reminder_log(subscription_id, renewal_date, sent_at)`, primary key `(subscription_id, renewal_date)`, `ON DELETE CASCADE`.
One row = one renewal occurrence already notified. Editing a subscription's renewal date creates a new occurrence, which re-arms the reminder. Rows older than 60 days are pruned.
