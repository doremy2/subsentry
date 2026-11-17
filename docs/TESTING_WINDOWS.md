# Testing SubSentry on Windows 10/11

**Status: Windows desktop behaviour is NOT verified.** What *is* verified on Windows: CI (`build-windows` on a real Windows runner) installs, type-checks, lints, runs all unit tests (including SQLite) and builds the installer. Nobody has yet run the widget window on a real Windows desktop. This checklist is how we change that. Report what you see, including "it worked".

## Setup (PowerShell)
Prerequisites: **Node.js 22+ (LTS)** and **Git for Windows**. No Visual Studio / C++ tools are needed (there are no native modules).
```powershell
git clone https://github.com/doremy2/subsentry.git
cd subsentry
git switch feature/widget-customization
npm ci
npm start                      # real desktop window with hot reload
```
With resize diagnostics (keep the terminal visible):
```powershell
$env:SUBSENTRY_DEBUG_RESIZE = "1"; npm start        # PowerShell
# cmd.exe:  set SUBSENTRY_DEBUG_RESIZE=1 && npm start
```
Start clean: quit SubSentry (tray icon > Quit), then `Remove-Item -Recurse -Force $env:APPDATA\SubSentry`.

Inspect saved settings (no `sqlite3` on Windows; Node's built-in module works):
```powershell
node -e "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(process.env.APPDATA+'\\SubSentry\\subsentry.db',{readOnly:true});for(const r of d.prepare('select key,value from preferences').all())console.log(r.key,'=',r.value)"
```

## 1. Resizing  (same checks as macOS; see `docs/TESTING_5A.md` section 1 for the full list)
- [ ] Hover the bottom-right corner: faint grip mark turns accent-colored; cursor becomes a diagonal resize cursor. Drag: the widget resizes smoothly. Terminal shows `[resize] begin axis=both ...` then `end ... saved=WxH`.
- [ ] Right edge and bottom edge: press 3-10 px inside the visible edge; only that dimension changes.
- [ ] Press the right edge **next to the big spend number** (a window-drag area): it must resize, not move the window.
- [ ] Release the mouse outside the window mid-drag: the resize ends.
- [ ] Minimum and maximum are respected; content never clips; the window never leaves the screen.
- [ ] Settings > Custom size: apply 420 x 600, an invalid value, the exact minimum; quit and relaunch: sizes persist.

## 2. Windows-specific checks
**Display scaling.** Settings > System > Display > Scale. Repeat a corner drag and a custom size at **100%, 125% and 150%** (sign out/in if Windows asks). Watch for: the widget growing or shrinking by itself, jitter while dragging, edges not following the cursor, saved size changing by a pixel or two after relaunch (1 px differences are expected: Windows rounds to physical pixels).

**Several monitors with different scaling.** Drag the widget from one monitor to the other (or move it with Win+Shift+Arrow), then resize on each. Watch for: wrong size after crossing, blurry text, grip not under the cursor.

**Transparency / clicks.** The widget is a transparent window; Electron cannot click through the transparent margin around the card (a known limitation). Note: what happens when you click the 16 px shadow margin around the card (does it block a desktop icon behind it)?

**Taskbar, Alt+Tab, tray.** The widget currently has a taskbar button and appears in Alt+Tab. The tray icon may be hidden under the **^** overflow arrow: drag it out to pin. Tray left-click toggles the widget; right-click menu has Show/Hide, Always on top, Quit.

**Z-order observations (these decide how we build the "desktop widget" feature):**
- [ ] With **Always on top** off, click another window over the widget: the widget goes behind it (normal).
- [ ] Press **Win+D** (show desktop): does the widget disappear with the other windows? (Record yes/no.)
- [ ] With **Always on top** on, does it stay above a full-screen video/game? (Expected: no, only above normal windows.)

**Appearance.** Cycle all five themes at 100% transparency and 40% over a bright and a dark wallpaper (Windows 10 and 11 if you have both). Rounded corners and the shadow should look clean, with no square dark/white corners.

**Notifications.** In `npm start` (unpackaged), Windows toasts may not appear because an unpackaged app has no Start Menu identity. Test notifications with the **installed** build below. In Settings > Send test notification, then check Action Center.

**Launch at login** only works in the installed build (Settings > Launch at login, then sign out/in).

## 3. Desktop mode (experimental)
See `docs/DESKTOP_MODE.md` for what it is and the 9-step test plan.

## 4. The installer (optional but valuable)
1. GitHub > Actions > the latest green run on the branch > Artifacts > **SubSentry-windows**. Extract it.
2. Run `SubSentry-Setup.exe`. Windows SmartScreen will warn (the build is unsigned): **More info > Run anyway**.
3. Repeat a quick resize, theme, quit/relaunch and test-notification check.

## Reporting
For each failure: Windows version (`winver`), display scaling per monitor, steps, expected vs actual, the terminal `[resize]` lines, and a screenshot. Paste into a GitHub Issue or the PR.
