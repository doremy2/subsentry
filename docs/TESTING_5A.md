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

## 1. Native resizing
- [ ] Hover the widget's bottom-right corner: cursor becomes a diagonal resize cursor and a small grip appears. Drag: the window grows/shrinks smoothly with the mouse (no lag, no jumping).
- [ ] Drag the right edge: only the width changes. Drag the bottom edge: only the height changes.
- [ ] Shrink as far as you can: it stops at a sensible minimum and nothing is cut off. Grow as far as you can: it stops at a maximum and never goes off the screen's edge.
- [ ] Release the mouse **outside** the window while dragging: the resize still ends (window does not keep following the cursor).
- [ ] Detailed layout: making the window taller shows more upcoming renewals; shorter shows fewer.
- [ ] Trackpad: same results (not just a mouse).
- [ ] Open Manage > Settings > Widget layout > **Minimal**, collapse the manager: compact widget becomes short and shows only spend + next payment. Switch back to **Detailed**: your earlier compact size returns.
- [ ] Settings > **Reset window size** returns the current layout to its default (compact 392x548 incl. margin).

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
