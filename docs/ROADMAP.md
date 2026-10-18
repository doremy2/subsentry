# Roadmap

| # | Milestone | Status |
|---|---|---|
| 1 | Cross-platform widget (frameless, draggable, compact/expanded, transparent, always-on-top, tray/menu bar, per-device position) | **Done** (Electron) |
| 2 | Functional subscription manager with SQLite persistence | **Done**: add/edit/delete, totals, validation, migrations, tests |
| 3 | Reminders + native notifications | **Done** (global lead time/hour/enabled; per-subscription overrides, snooze and custom sounds not built) |
| 4 | Recurring-payment detection from CSV uploads | In progress: import UI + contract on `feature/import-ui` (Developer 1); detection engine on `feature/csv-detection` (Developer 2) |
| 5 | 5A widget customization (themes, resizable layouts) on `feature/widget-customization`; 5B installers, cross-OS testing, signing/notarization, distribution | 5A not started; CI builds unsigned installers now; signing per docs/DISTRIBUTION.md |

Not planned yet: wallpaper-layer embedding, cloud sync, auto-update, bank APIs.
