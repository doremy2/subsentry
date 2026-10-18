# Architecture

One Electron app, one codebase, for Windows 10/11 and macOS. TypeScript everywhere.

```
┌────────────────────────── Electron main process (Node 24) ─────────────────────────┐
│ electron/main/index.ts   app lifecycle, single instance, wiring                    │
│ platform.ts              THE ONLY place OS differences live                         │
│ window.ts                frameless widget, compact/expanded, per-device position    │
│ tray.ts                  Windows tray icon / macOS menu bar item                    │
│ ipc.ts                   validated, sender-checked IPC handlers                     │
│ db/                      node:sqlite: migrations, Store (subscriptions, prefs, log) │
│ reminders/scheduler.ts   checks on start, every 15 min, on wake + after edits       │
└───────────────▲─────────────────────────────────────────────────────────────────────┘
                │ typed IPC (electron/shared/api.ts) — contextBridge, sandboxed
┌───────────────┴──────────────── preload (electron/preload) ────────────────────────┐
│ exposes window.subsentry: SubSentryApi — nothing else from Node/Electron           │
└───────────────▲─────────────────────────────────────────────────────────────────────┘
┌───────────────┴──────────────── Renderer (src/) — React + Tailwind ────────────────┐
│ components/   UI only (widget/, manager/, ui/)                                      │
│ state/        AppProvider + useApp(): loading/error state, actions                  │
│ data/         DataServices interface; IPC impl (desktop) + memory impl (browser)    │
│ desktop/      WindowService wrapper over window.subsentry                           │
│ domain/       PURE logic: model, billing, dates, money, validation (unit-tested)    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Rules
- `src/domain` imports nothing from React/Electron/Node. It is shared by renderer and main (main re-validates everything the renderer sends).
- The renderer never touches SQLite or Node. It only sees `window.subsentry`.
- `process.platform` checks live in `electron/main/platform.ts` only.
- Adding a feature that crosses the boundary: add the channel + type in `electron/shared/api.ts`, handler in `ipc.ts`, bridge in `preload.ts`, wrapper in `src/data` or `src/desktop`.

## Why these choices
- **`node:sqlite` (built into Electron's Node)** instead of better-sqlite3: no native module to compile/rebuild on Windows, macOS (Intel + Apple Silicon) or CI, so the app can be a universal build. Trade-off: the module is still marked experimental by Node; it sits behind the `Store` interface, so swapping to better-sqlite3 later touches only `electron/main/db/`.
- **Electron Forge + Vite plugin**: official packaging path; one config produces the Windows installer and the macOS DMG.
- **Main process bundles its npm deps** (`vite.main.config.mts`); the packaged app ships no `node_modules`.

## Platform differences handled in `platform.ts`
| Concern | Windows | macOS |
|---|---|---|
| Tray | `tray.png` in the notification area | monochrome `trayTemplate.png` in the menu bar (adapts to light/dark) |
| Always on top | `setAlwaysOnTop(true)` | `setAlwaysOnTop(true, "floating")` |
| Frameless | `frame:false`, own drag region | plus `titleBarStyle:"hidden"` with traffic lights moved off-window |
| Menu | none | app/edit/window menu (needed for Cmd+C/V/Q) |
| Notifications | needs AppUserModelID (`com.subsentry.app`) | works; best when the app is signed |
| Launch at login | login item (packaged builds only) | login item (packaged builds only) |
| Dock/taskbar | taskbar button | Dock icon; click re-shows the widget |
| Window close | hides to tray; Quit from tray/Settings | hides to menu bar; Cmd+Q quits |

## Window behaviour
- Frameless, transparent, non-resizable; size changes only through compact/expanded modes (`electron/shared/windowSizes.ts`). A 16px transparent margin hosts the CSS shadow.
- Position saved per device (hash of host + user + OS) in `preferences.windowPositions`, restored only if still reachable on a connected display; otherwise placed top-right of the primary display.
- Transparency: works on both OSes. Blur/vibrancy (Mica/acrylic, macOS vibrancy) is deferred; true wallpaper-layer embedding is out of scope.

## Security posture
`contextIsolation`, `sandbox`, no `nodeIntegration`, IPC sender check, input re-validation in main, navigation/window-open blocked, production CSP, Electron Fuses (no RunAsNode, asar-only).

## Future (partner track)
Milestone 4 detection lives in `electron/main/detection/` (TypeScript CSV import first), behind a `DetectionService` that returns *suggested* `SubscriptionInput`s. An optional Python sidecar (spawned child process, JSON over stdio) is allowed if the TS version is not enough; it must not be required to run the app.

## Reminders (Milestone 3)
- **Rules** are pure (`src/domain/reminders.ts`): active subscriptions whose next renewal (stale dates rolled forward) is within `reminderLeadDays`, after `reminderHour` local time, not already in `reminder_log`.
- **Scheduler** (`electron/main/reminders/scheduler.ts`) sends ONE notification per check (a summary when several are due) and logs the occurrences only if the OS actually showed it; otherwise it retries on the next check. Triggers: 5 s after launch, every 15 min, `powerMonitor` resume, and after any subscription/preference change.
- **Limits:** reminders only fire while the app is running (it stays in the tray/menu bar; enable launch at login). On macOS, notifications appear under the app name and need permission in System Settings > Notifications; unsigned dev builds appear as "Electron".
