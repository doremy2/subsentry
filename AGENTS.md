# AGENTS.md - shared conventions (Claude Code and Codex)

SubSentry: Tauri 2 desktop widget (React + TypeScript + Tailwind 4, SQLite). Windows first, keep macOS possible.

## Layout and boundaries
- `src/domain/`: pure logic and types. No I/O, no React, no Tauri. Fully unit-tested.
- `src/data/`: repository interfaces (`types.ts`), SQLite and in-memory implementations. Only place SQL lives.
- `src/desktop/`: native window access behind `WindowService`. Only place `@tauri-apps/api/window` is imported.
- `src/state/`: React context wiring data + desktop to the UI.
- `src/components/`: UI only; talks to `useApp()`, never to SQL or Tauri.
- `src-tauri/`: Rust shell (window config, tray, migrations, capabilities). Backend logic and integrations go here or in new modules behind a repository interface.

## Rules
- TypeScript strict; no `any`. Money is integer minor units. Dates are `YYYY-MM-DD` strings.
- Add or change billing/validation logic together with tests (`*.test.ts`, Vitest).
- Schema changes: new migration version in `src-tauri/src/migrations.rs` + update `docs/DATA_MODEL.md`.
- New Tauri permissions go in `src-tauri/capabilities/default.json`, minimal.
- Avoid new dependencies unless clearly needed. No secrets in the repo.
- Checks before PR: `npm run typecheck`, `npm test`, `npm run build`, and `cargo check` in `src-tauri/`.
- Out of scope for Milestone 1: bank integration, automatic transaction detection (partner's track).
- Branching: see `docs/BRANCHING.md`.
