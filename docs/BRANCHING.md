# Branching strategy

- `main`: always builds, passes CI (both macOS and Windows jobs). Changes land via pull request only.
- `develop` (optional): integration branch if work gets busy; otherwise PR straight to `main`.
- Feature branches from `main`, short-lived: `feat/<area>-<topic>`, `fix/<topic>`, `docs/<topic>`, e.g. `feat/ui-reminder-settings`, `feat/detection-csv-import`.
- Ownership map and contract-change rules: see `AGENTS.md`. Touching shared contracts (`src/domain`, `electron/shared/api.ts`, schema) = small separate PR, flagged to the other developer first.
- PR checklist: CI green on both OSes, tests for logic changes, docs updated, no secrets.
- Squash-merge; the other developer reviews.
- Releases: tag `vX.Y.Z` on `main` (see `docs/DISTRIBUTION.md`).
- `tauri-prototype` tag preserves the abandoned Tauri prototype for reference only.
