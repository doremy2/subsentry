# AGENTS.md - shared conventions (Claude Code and Codex)

SubSentry: one Electron + React + TypeScript app for Windows and macOS. No Rust/Tauri. TypeScript is the primary language (Python only as an optional, non-required detection sidecar, and only by agreement). Read `docs/ARCHITECTURE.md` and `docs/BRANCHING.md` first.

## Who owns what
| | Developer 1 (Claude Code) | Developer 2 (Codex) |
|---|---|---|
| Branches | `feature/import-ui`, `feature/widget-customization` | `feature/csv-detection` |
| Areas | Electron shell, React UI, CSV import UI, suggestion UI, widget customization, native desktop behaviour, cross-platform testing, packaging | CSV parsing & bank formats, transaction normalization, merchant matching, recurring detection, confidence scoring, billing prediction, detection tests |
| Paths | `src/components/**`, `src/state/**`, `src/desktop/**`, `src/styles/**`, `electron/main/{window,tray,platform,index}.ts`, `electron/preload/**`, `forge.config.ts` | `electron/main/detection/**`, `src/domain/csv/**`, new helper modules for normalization/matching |
| Shared (change via small `contract-change` PR, announce first) | `src/domain/detection/{types,validation,run}.ts`, `src/domain/subscription.ts`, `src/data/types.ts`, `electron/shared/api.ts`, DB migrations (`electron/main/db/database.ts`), `docs/DATA_MODEL.md` | same |

Note: `src/domain/csv/` was first written by Developer 1 so the import preview works. Developer 2 owns it from now on: improve bank-format handling freely, but keep the exported function signatures the UI uses (`parseCsv`, `tableFromRows`, `guessMapping`, `buildTransactions`, ...) or coordinate the change.

## Workflow rules
- `main` is stable and protected: **never push to it**. Work on your branch, open a PR, get CI green (macOS + Windows) and one review, squash-merge, delete the branch. Details and conflict handling: `docs/BRANCHING.md`.
- Do not edit the other developer's owned paths without telling them. Do not change shared contracts simultaneously.
- Before a PR: `npm run check` (typecheck + lint + tests). For window/packaging changes also run `npm start` and `npm run package` on your OS and state which OS you tested.

## Code rules
- TypeScript strict, no `any` (ESLint enforces). Money = integer minor units. Dates = `YYYY-MM-DD` strings.
- `src/domain` is pure (no React/Electron/Node). Logic changes ship with Vitest tests.
- The renderer never touches Node or SQLite; it only uses `window.subsentry` through `src/data` and `src/desktop`.
- Anything coming over IPC is untrusted: validate in main (`parseSubscriptionInput`, `sanitizePreferencePatch`, `parseTransactions`, `validateDetectionResult`).
- OS differences go in `electron/main/platform.ts` only; no scattered `process.platform` checks. Use `node:path`; assume case-insensitive filesystems on macOS.
- Schema changes: append a migration to `electron/main/db/database.ts` (never edit shipped ones), update `docs/DATA_MODEL.md`, add a store test. One in-flight migration at a time.
- New cross-boundary feature: channel + type in `electron/shared/api.ts`, handler in `ipc.ts`, bridge in `preload.ts`.
- The main process bundles its npm deps (packaged app has no `node_modules`). Avoid native modules and unnecessary dependencies.

## Privacy and security rules (financial data)
- Bank/transaction data stays **local and in memory**: never persisted to SQLite, never logged, never sent over a network, never committed. Detection runs in the main process with no network access.
- Suggestions are **never saved automatically**; only an explicit user Confirm creates a subscription.
- Never commit `node_modules`, databases, `.env`, certificates/keys, or real statements. Only `docs/samples/*.MOCK.csv` (fake data) is allowed. Do not upload real statements to Codespaces or any cloud tool.
- Signing credentials live only in GitHub secrets (`docs/DISTRIBUTION.md`).

## Out of scope
A second app per OS; true wallpaper-layer embedding; a Python/backend service (needs agreement).
