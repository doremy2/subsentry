# Data model

Source of truth: `src/domain/subscription.ts` (TypeScript) and `src-tauri/src/migrations.rs` (SQLite). Keep all three in sync.

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
Keys: `accent`, `opacity` (0.4-1), `alwaysOnTop`, `mode` (`compact|expanded`), `windowPosition` (`{x,y}` physical px), `seeded` (demo data inserted once).
Decoding is defensive (`src/data/preferencesCodec.ts`): bad values fall back to defaults.

## Rules
- Totals are per currency; there is no FX conversion.
- Monthly equivalent = price x periods per year / 12 (weekly uses 52).
- Schema changes: append a new migration version; never edit a shipped one.
