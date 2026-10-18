# Branching strategy

- `main`: always builds and passes tests. Protected; changes land via pull request.
- Feature branches from `main`, short-lived: `feat/<area>-<topic>`, `fix/<topic>`, `docs/<topic>`.
- Ownership to avoid conflicts:
  - Frontend / desktop (`src/components`, `src/desktop`, `src/state`, `src/styles`): Claude Code side.
  - Backend / detection / integrations (`src-tauri/`, new `src/integrations/`): Codex side.
  - Shared contracts (`src/domain`, `src/data/types.ts`, `docs/DATA_MODEL.md`): change in a small, separate PR and tell the other developer first.
- Before opening a PR: `npm run typecheck && npm test && npm run build`; for Rust changes also `cargo check` in `src-tauri`.
- Squash-merge; one reviewer from the other developer.
- Never commit secrets; use `.env` (git-ignored) and document variables in `.env.example`.
