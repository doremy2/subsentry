# Desktop mode (Windows, experimental)

**Status: implemented, unit-tested on Linux, NOT verified on a real Windows desktop.** It is off by default. Nothing about it has been seen working on Windows yet: the first real test is yours (see below).

## What it is
Settings > **Desktop mode (EXPERIMENTAL)** (Windows only). The widget stays **behind your other windows**, above the wallpaper and desktop icons, like a desktop gadget, and remains clickable and resizable.
- It has no taskbar button (the tray icon still shows/hides it).
- Clicking it raises it so you can use it; when focus leaves (you click elsewhere) it drops back to the bottom.
- Opening the manager (expanded view) behaves like a normal window; desktop mode pauses until you collapse back to the widget.
- "Show desktop" (Win+D) minimizes windows; the widget undoes its own minimize so it stays visible. *This is a guess; see unknowns.*
- It cannot be combined with **Always on top**: switching one on switches the other off.

## How it works
Electron has no API to send a window to the bottom of the z-order (only `moveTop` / `moveAbove`). So a small hidden **PowerShell** process holds one Win32 call, `SetWindowPos(HWND_BOTTOM, SWP_NOSIZE|SWP_NOMOVE|SWP_NOACTIVATE)`:
- `electron/main/desktopMode/protocol.ts`: pure: the command protocol, handle parsing, the script text
- `electron/main/desktopMode/helper.ts`: owns the PowerShell process (FIFO replies, timeouts, cleanup)
- `electron/main/desktopMode/controller.ts`: decides *when* to push down (blur, show/restore without focus, minimize), pauses while expanded, gives up after 3 consecutive failures
- `electron/main/index.ts` / `platform.ts`: wiring, mutual exclusion with Always on top, Windows-only gate

No native Node module and no new dependency. If anything fails (PowerShell blocked by policy or antivirus, `Add-Type` unavailable, repeated errors) desktop mode **switches itself off**, shows a notification, and the widget keeps working normally.

## Security notes
- The helper script is a fixed string in the app; the only value ever sent to it is a window handle, validated as digits before it is written (`isHwndText`), and the script accepts exactly one command (`BOTTOM <number>`).
- It is launched as `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ...`. `Bypass` applies to that one process. The script makes no network calls. Security software that blocks PowerShell with `Add-Type` will make desktop mode unavailable (by design it then turns itself off).

## Known unknowns (only a real Windows test can settle these)
1. Does the PowerShell script run as written? It could not be syntax-checked in the Linux development environment.
2. Does Win+D really keep the widget visible, or does a flicker/hide still happen?
3. Does clicking the widget, then clicking elsewhere, reliably send it back down without flicker?
4. Does `SetWindowPos` push it below the desktop icons layer? (Expected: no, it stays above wallpaper and icons.)
5. Mixed-DPI multi-monitor and Windows 10 vs 11 differences.
6. The first start takes a second or two while PowerShell compiles the binding.

## Test plan (Windows)
```powershell
git switch feature/windows-desktop-mode
npm ci
$env:SUBSENTRY_DEBUG_DESKTOP = "1"; npm start      # logs "[desktop-mode] ..." lines in this terminal
```
1. Open the manager (Manage subscriptions) > Settings > turn **Desktop mode** on. Terminal: `helper <- READY` within a few seconds. (No READY = the script failed: paste the terminal output.)
2. Collapse back to the widget. Expected: it drops behind your other windows; taskbar button disappears. Terminal: `helper -> BOTTOM <number>` then `helper <- OK`.
3. Open a normal window over the widget's area, then move it away: the widget should be visible again, behind it.
4. Click the widget (on the desktop or in a gap): it should come to the front and work. Click another window: it should drop back (terminal shows another BOTTOM/OK).
5. Press **Win+D**: does the widget stay visible? Press again. Note what happens (flicker, hidden, fine).
6. Tray icon > Show/Hide: show must bring it forward and keep it there until you click elsewhere.
7. Turn **Always on top** on: Desktop mode must switch itself off in Settings.
8. Resize with the grips and set a custom size while in desktop mode; quit and relaunch: desktop mode and the size should both come back.
9. Optional failure path: on a PC where PowerShell is restricted by policy or security software, the toggle should turn itself off with a notification and the widget should behave normally. (Do not try to simulate this by changing system variables.)

Report: Windows version (`winver`), scaling, steps 1-9 results, and the `[desktop-mode]` terminal lines. Do not call it verified until these pass on your PC.
