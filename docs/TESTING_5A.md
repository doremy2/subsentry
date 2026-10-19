# Testing Milestone 5A on your Mac (and Windows)

Automated tests and Linux runs cannot confirm native behaviour. This checklist covers what only a real Mac/PC can. ~15 minutes. Mark each box; report failures with the OS, version and what you saw.

## Setup
```bash
git clone https://github.com/doremy2/subsentry.git && cd subsentry     # or: git fetch && git switch feature/widget-customization
git switch feature/widget-customization
npm ci
npm start                       # real desktop window with hot reload
```
Start clean (optional): quit the app, then delete the data folder:
- macOS: `rm -rf ~/Library/Application\ Support/SubSentry`
- Windows (PowerShell): `Remove-Item -Recurse $env:APPDATA\SubSentry`

Inspect saved settings any time (macOS has `sqlite3` built in):
```bash
sqlite3 ~/Library/Application\ Support/SubSentry/subsentry.db "select key, value from preferences;"
```

## 1. Native resizing  (**macOS resizing is NOT verified yet.** An earlier build failed on a real Mac; this build has fixes that worked on Linux only)

**What you should see:** a faint diagonal "grip" mark at the bottom-right corner of the widget. Hover it: it turns the accent color. Hover the middle of the **right edge** or **bottom edge**: a thin accent-colored pill appears. Each handle is about 18 px wide and reaches both inside and just outside the card edge, so you do not have to aim precisely.

Run with diagnostics so a failure can be explained (keep the terminal visible):
```bash
SUBSENTRY_DEBUG_RESIZE=1 npm start
```
- [ ] **Corner:** press on the grip mark and drag diagonally. Expected: the widget grows/shrinks with the mouse; the terminal prints `[resize] begin axis=both ...`, some `tick` lines and `end ... saved=WxH`.
- [ ] **Right edge:** press 3-10 px inside the right edge, halfway down, and drag left/right. Only the width changes.
- [ ] **Bottom edge:** same for the bottom edge; only the height changes.
- [ ] **Overlap with the draggable area:** press the right edge *next to the big spend number* (the area that normally drags the window). Expected: it **resizes**, the window does not move.
- [ ] **First click on a background widget:** click another app so SubSentry is not focused, then press and drag a grip immediately. Expected: it resizes on the first try (this is what `acceptFirstMouse` fixes).
- [ ] **Release outside:** drag so the cursor leaves the window, release there. The resize must end (the widget must not keep following the mouse).
- [ ] **Limits:** shrink to the minimum and grow to the maximum: it stops (compact min 320x428, max 528x868 of visible widget), never clips content, never leaves the screen.
- [ ] Trackpad: repeat the corner drag with a trackpad (tap-and-drag or click-and-drag).
- [ ] Detailed layout: a taller widget shows more upcoming renewals.

**Reading the terminal output if it does not work**
| What you see | Meaning |
|---|---|
| **No** `[resize] begin` line when you press a grip | The press never reached the app (something covers the grip, a drag region wins, or the window ignored the click). Tell me exactly where you pressed. |
| `begin` appears but the window does not change, plus `WARNING setBounds had no effect` | The app tried, but macOS refused to resize the window. Paste the whole `begin ... WARNING` block. |
| `begin`, `tick` lines and the window changes, but `end` never appears | Releasing the mouse was not detected. Say whether you released inside or outside the window. |
| It works | Note which of the above checks passed. |

### Custom size (Settings > Widget layout > Custom size)
- [ ] Choose **Compact (Detailed)**: the width/height fields show the current visible size (default 360 x 516).
- [ ] Enter 420 and 600, **Apply size**: the message says "Applied 420 x 600 px."; collapse to the widget and confirm it is that size (a ruler/screenshot tool such as Cmd+Shift+4 shows pixel sizes in points).
- [ ] Enter 100 and 99999: red messages state the allowed range and the widget does not change.
- [ ] Enter the exact minimum (320 and 428) and maximum (528 and 868): accepted.
- [ ] Choose **Expanded manager** and apply a size: the manager resizes immediately.
- [ ] Enter a size larger than your screen: the message says "Fitted to your screen: ...".
- [ ] Quit completely (menu bar > Quit) and relaunch: the sizes you set or dragged come back, for each layout.
- [ ] **Reset window size** returns everything to defaults.

## 2. Window positioning
- [ ] Drag the widget by its header (and by the big spend number) to a new spot, quit (tray/menu bar > Quit), relaunch: it reopens in the same place.
- [ ] Place the widget near the right edge of the screen, click **Manage subscriptions** (expands) then collapse: the compact widget returns to **exactly** where it was.
- [ ] Expand, **move** the expanded window somewhere else, collapse: the compact widget stays at the new spot (does not jump back).
- [ ] Expanded view never opens partly off-screen, including when the widget started at a screen edge.
- [ ] External monitor (if you have one): move the widget to it, quit, unplug the monitor, relaunch: the widget appears on the remaining screen (not lost off-screen).
- [ ] Retina/HiDPI (Mac) or scaled display (Windows 125%/150%): resize and positions still behave; no blurriness or offsets between cursor and edge.
- [ ] Always on top (Settings): still works after resizing; hide to menu bar/tray and restore from the icon keeps the size and position.

## 3. Themes
For each of Midnight, Graphite, Aurora, Sunset, Light (Settings > Theme), in **compact and expanded**:
- [ ] All text is readable; status badges (Active/Paused), amounts and the "next payment" days are clear.
- [ ] Look at it over a **bright** wallpaper and a **dark** one with the Transparency slider at 100%, 82% and 40%: still readable at each.
- [ ] The accent colors (4 swatches) look good on the theme, especially on **Light**.
- [ ] Switching themes fades smoothly, no flash of the wrong colors.
- [ ] Rounded corners and soft shadow look clean (no dark/white square corners or hard edges around the card). Note exactly what you see on macOS vs Windows 10/11 if you can test both.

## 4. Persistence
- [ ] Pick a theme + accent + 60% transparency + Minimal layout, resize the widget, move it. Quit and relaunch: **all** of it comes back (theme, accent, transparency, layout, size, position).
- [ ] Expand, resize the manager, collapse, quit, relaunch, expand: the manager has the size you left it.
- [ ] (Mac) `sqlite3` command above shows `theme`, `compactLayout`, `windowSizes`, `windowPositions`.

## 5. Packaged app (optional but valuable)
```bash
npm run package      # macOS: out/SubSentry-darwin-<arm64|x64>/SubSentry.app
```
- [ ] Open the app (first time: right-click > Open; or `xattr -cr out/SubSentry-darwin-*/SubSentry.app`). Repeat a quick resize + theme + relaunch check.

## Reporting
For each failure: OS + version, Mac model/chip (or Windows build), display setup, steps, expected vs actual, and a screenshot. Paste into a GitHub issue or the PR.
