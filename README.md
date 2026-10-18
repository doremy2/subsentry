# SubSentry

Desktop subscription watchdog: a compact, draggable widget showing monthly spend and upcoming renewals, with an expanded view to add, edit and delete subscriptions. Local SQLite storage. Tauri 2 + React + TypeScript + Tailwind.

## Prerequisites (Windows)
1. [Node.js](https://nodejs.org) 20+ (LTS)
2. [Rust](https://rustup.rs) (stable, MSVC toolchain)
3. Visual Studio Build Tools with "Desktop development with C++"
4. WebView2 runtime (preinstalled on Windows 10/11)

See the official [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

## Run
```bash
npm install
npm run tauri dev      # real desktop app (first Rust build takes a few minutes)
npm run dev            # browser-only UI preview with in-memory demo data
```

## Test and build
```bash
npm run typecheck
npm test
npm run build          # frontend
npm run tauri build    # installer in src-tauri/target/release/bundle
```

## Using it
- Drag the widget by its header or the spend area. Position is remembered.
- Expand button / "Manage subscriptions" opens the manager; the collapse button returns.
- Hide sends it to the system tray; click the tray icon to bring it back. Closing the window also hides it. Quit from the tray menu or Settings.
- Settings (in the manager): accent color, transparency, always-on-top.
- Demo data is inserted on first launch. Delete `subsentry.db` in the app data folder to reset.

## Docs
- [AGENTS.md](AGENTS.md): conventions and module boundaries
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md)
- [docs/BRANCHING.md](docs/BRANCHING.md)

## Known limits
Transparency works on Windows; Mica/blur, true wallpaper-layer embedding, notifications and autostart are planned for later milestones.
