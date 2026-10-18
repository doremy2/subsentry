# Roadmap

| # | Milestone | Status |
|---|---|---|
| 1 | Cross-platform widget (frameless, draggable, compact/expanded, transparent, always-on-top, tray/menu bar, per-device position) | **Done** (Electron) |
| 2 | Functional subscription manager with SQLite persistence | **Done**: add/edit/delete, totals, validation, migrations, tests |
| 3 | Reminders + native notifications (scheduler in main, per-subscription lead time, dedupe, click to open) | Next. `showNotification` + Windows AppUserModelID already in place |
| 4 | Recurring-payment detection from CSV uploads (partner) | Planned |
| 5 | Installers, cross-OS testing, signing/notarization, distribution | CI builds unsigned installers now; signing per docs/DISTRIBUTION.md |

Not planned yet: wallpaper-layer embedding, cloud sync, auto-update, bank APIs.
