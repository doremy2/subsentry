# SubSentry

A polished desktop widget that watches your subscriptions: monthly spend and upcoming renewals at a glance, with an expanded manager to add, edit and delete them. **One Electron codebase for Windows 10/11 and macOS.** Data stays local in SQLite.

Stack: Electron + Electron Forge, React + TypeScript, Tailwind CSS 4, Node `node:sqlite`, Vitest. Optional Python for detection later.

## Prerequisites
- **Node.js 22+** (LTS) and npm. That's it: no Rust, no native compilers (SQLite is built into Electron's Node).
- macOS: nothing extra. Windows: nothing extra.

## Run (macOS or Windows)
```bash
npm install
npm start                 # launches the real desktop widget with hot reload
```
`npm run preview:web` serves only the UI in a browser with in-memory demo data (no window/tray/SQLite).

## Test, build, package
```bash
npm run typecheck
npm test                  # domain logic + SQLite store tests
npm run package           # unpacked app in out/
npm run make              # installer for the current OS in out/make/
```
macOS produces `.app` + `.dmg` (+ zip); Windows produces `SubSentry-Setup.exe` (+ zip). CI builds both on separate runners; see [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md) for signing and notarization.

## Using it
- Drag the widget by its header or spend area; position is remembered per device.
- "Manage subscriptions" expands it; the collapse button returns to compact.
- Hide sends it to the tray (Windows) / menu bar (macOS). Click the icon to toggle, right-click for the menu (Show/Hide, Always on top, Quit). Closing the window also just hides it.
- Settings (in the manager): accent color, transparency, always on top, launch at login (packaged builds only), test notification.
- Demo data is inserted on first launch only. Database location: Electron's `userData` folder (`~/Library/Application Support/SubSentry` or `%APPDATA%\SubSentry`), file `subsentry.db`.

## Project layout
```
electron/main/      main process: window, tray, platform layer, IPC, SQLite (db/)
electron/preload/   the only bridge exposed to the UI (window.subsentry)
electron/shared/    IPC contract + window sizes (used by main, preload, renderer)
src/domain/         pure logic: model, billing, dates, money, validation (+ tests)
src/data/           data-service interface, IPC and in-memory implementations
src/state/ src/desktop/ src/components/   React UI
assets/             app icons, tray icons
docs/               architecture, data model, branching, roadmap, distribution
```

## Docs
[Architecture](docs/ARCHITECTURE.md) · [Data model](docs/DATA_MODEL.md) · [Roadmap](docs/ROADMAP.md) · [Branching](docs/BRANCHING.md) · [Distribution & signing](docs/DISTRIBUTION.md) · [AGENTS.md](AGENTS.md)

## Known limits
Transparency works on both OSes; blur/vibrancy, wallpaper-layer embedding, reminders (Milestone 3), CSV detection (Milestone 4) and auto-update are not built yet. The earlier Tauri prototype is preserved at git tag `tauri-prototype`.
