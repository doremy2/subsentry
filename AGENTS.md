# AGENTS.md - shared conventions (Claude Code and Codex)

SubSentry: one Electron + React + TypeScript app for Windows and macOS. No Rust/Tauri. JavaScript/TypeScript is the primary language (Python only as an optional, non-required detection sidecar). Read `docs/ARCHITECTURE.md` first.

## Ownership (to avoid conflicts)
| Area | Owner | Paths |
|---|---|---|
| UI, desktop shell, platform layer | Claude Code side | `src/components`, `src/state`, `src/desktop`, `src/styles`, `electron/main/{window,tray,platform,index}.ts`, `electron/preload` |
| Data, backend logic, detection | Codex side | `electron/main/db/`, `electron/main/detection/` (new), `electron/main/reminders/` (new) |
| Shared contracts (change via small PR, tell the other dev) | both | `src/domain`, `src/data/types.ts`, `electron/shared/api.ts`, `docs/DATA_MODEL.md` |

## Rules
- TypeScript strict, no `any`. Money = integer minor units. Dates = `YYYY-MM-DD` strings.
- `src/domain` is pure (no React/Electron/Node). Billing/validation changes ship with Vitest tests.
- The renderer never touches Node or SQLite; it only uses `window.subsentry` through `src/data` and `src/desktop`.
- Anything coming over IPC is untrusted: validate in main (`parseSubscriptionInput`, `sanitizePreferencePatch`).
- OS differences go in `electron/main/platform.ts` only; no scattered `process.platform` checks.
- Schema changes: append a migration to `electron/main/db/database.ts` (never edit shipped ones), update `docs/DATA_MODEL.md`, add a store test.
- The main process bundles its npm deps (packaged app has no `node_modules`). Avoid native modules; avoid new dependencies unless clearly needed.
- New cross-boundary feature: channel + type in `electron/shared/api.ts`, handler in `ipc.ts`, bridge in `preload.ts`.
- No secrets in the repo. Signing credentials only as GitHub secrets (see `docs/DISTRIBUTION.md`).
- Before a PR: `npm run typecheck && npm test`; for window/packaging changes also run `npm start` and `npm run package` on your OS.
- Never create a second app or fork the codebase per OS. Wallpaper-layer embedding is out of scope.
- Branching: `docs/BRANCHING.md`.
