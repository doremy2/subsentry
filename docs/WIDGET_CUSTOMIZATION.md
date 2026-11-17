# Milestone 5A: widget customization

Branch: `feature/widget-customization` (Developer 1). Window/shell code is in `electron/main/{window,platform}.ts`; UI in `src/components/**`; styling in `src/styles/index.css`.

## What it does
| Feature | Where | Notes |
|---|---|---|
| **5 themes**: Midnight, Graphite, Aurora, Sunset, Light | Settings > Theme | `<html data-theme>`; CSS variables in `src/styles/index.css`. Light flips `--color-white` so every `white/NN` utility turns into dark ink. |
| **Accent color** (4) | Settings > Accent | Light theme uses deeper accent variants for contrast. |
| **Transparency** | Settings > Transparency | 40-100% surface opacity (CSS alpha on the transparent window). |
| **Compact layouts**: Detailed / Minimal | Settings > Widget layout | Detailed lists upcoming renewals and shows more of them as the window gets taller; Minimal shows spend + next payment only. |
| **Expanded** manager | unchanged | |
| **Resizable** | drag right edge, bottom edge, or bottom-right corner | Minimum/maximum per layout (`electron/shared/windowSizes.ts`): compact 352x460..560x900, minimal 352x296..560x420, expanded 820x560..1600x1100 (DIPs incl. 16px shadow margin). Never grows past the display. |
| **Persistence** | SQLite | Theme/accent/opacity/layout in `preferences`; **size per layout and per device** and position per device (`windowSizes`, `windowPositions`). "Reset window size" restores defaults. |
| **Animation / hover** | CSS | Theme cross-fade, hover lift on cards/rows, press feedback; `prefers-reduced-motion` respected. |

## Position when expanding and collapsing
Expanding can slide the window left/up so the bigger window fits on screen. The compact widget's position is remembered at that moment (`electron/shared/windowPlacement.ts`, used by `window.ts`). On collapse the widget returns to it, **unless you moved the window while it was expanded**, in which case it stays where you put it (compared with a 2 px tolerance). The memory is in-process only: if the app restarts while expanded, collapsing keeps the current spot.

## How resizing works (and why)
Electron cannot reliably resize *transparent frameless* windows from their native edges on Windows. So resizing is ours: the grips in `ResizeGrips.tsx` tell the main process to start/stop; `window.ts` follows `screen.getCursorScreenPoint()` at ~60 Hz and calls `setBounds` with `resizedSize()` (pure, unit-tested). Same code path on macOS and Windows. A 30 s safety timer ends a drag if the renderer never reports release.

**macOS bug report and fix.** The first version did not resize on a real Mac. Measuring hit-testing in Electron showed why: the grips were 6 px strips *inside* a rounded, clipped card, the corner icon was drawn in the clipped corner, and the right strip overlapped a window-drag region without declaring `no-drag`. Fixes (`src/components/ui/gripGeometry.ts`, `ResizeGrips.tsx`):
- grips straddle the visible card edge: edges 12 px inside + 6 px outside, corner 24 + 10 px; the corner icon sits inside the rounded corner
- explicit `-webkit-app-region: no-drag` on every grip
- drag ends on window pointer-up / cancel / blur / unmount (not just on the grip)
- `acceptFirstMouse: true` so the first click on an unfocused widget is not swallowed on macOS
- hover hints: faint corner icon, accent pill on edge hover
- `SUBSENTRY_DEBUG_RESIZE=1` logs `begin/tick/end` and warns when `setBounds` has no effect

## Windows
- Electron's own docs list limits for transparent windows: they are not natively resizable and the transparent area cannot be clicked through ([frameless window docs](https://www.electronjs.org/docs/latest/api/frameless-window), [issue #1335](https://github.com/electron/electron/issues/1335)). That is why `resizable` stays `false` and resizing is done by our own grips + `setBounds`, and why every grip reaches well inside the opaque card.
- With fractional display scaling (125%, 150%) Windows rounds sizes to physical pixels, so a window can read back 1 DIP off. The resize loop treats sizes within 1 DIP as equal (`sizesMatch`) instead of re-applying bounds every tick.
- Verified on a real Windows runner (CI): install, typecheck, lint, 186 unit tests, installer build. **Not verified:** the window itself on a Windows desktop. Use `docs/TESTING_WINDOWS.md`.

## Desktop-layer widget (not built; options)
Goal: the widget sits on the desktop like a Rainmeter skin (behind normal windows, above the wallpaper), stays clickable, and can be resized and restyled. Electron 44 has **no API to send a window to the bottom of the z-order** (only `moveTop` and `moveAbove(otherWindow)`; Electron's `backgroundMaterial` (Mica/Acrylic, Windows 11 22H2+ only) paints a backdrop for the whole window rectangle, which would probably not fit a rounded card inside a transparent margin; untested). Community packages that do it ([electron-bottom-window](https://github.com/tuj84257/electron-bottom-window), [electget](https://github.com/fronterior/electget), [electron-bottom-most](https://www.npmjs.com/package/electron-bottom-most)) wrap native Win32 calls and were last updated in 2022.

| Option | Behaviour | Needs native code | Main risks |
|---|---|---|---|
| **A. Always on top** (exists) + show/hide hotkey | Floats above other windows, interactive | No | Covers other windows; not "on the desktop" |
| **B. Bottom-most layer** (`SetWindowPos(HWND_BOTTOM)`) | Behind all normal windows, above wallpaper and icons; fully interactive while visible | Yes: an FFI library (e.g. koffi) or a small helper process | Clicking raises the window, so it must be pushed back on blur; **Win+D hides it** unless handled; hidden whenever a window covers it |
| **C. Wallpaper-layer embed** (parent into `WorkerW`) | Part of the desktop itself; survives Win+D | Yes | The desktop host does not deliver mouse input to children, so "clickable" needs global input hooks + forwarding: fragile; most work |

Recommendation: keep A, then build B behind an opt-in "Desktop mode" setting for Windows, developed **with live testing on a Windows machine** (Win+D and focus behaviour can only be settled by trying them). Avoid C. Nothing here is implemented yet.

## Custom size
Settings > Widget layout > Custom size: type an exact width and height for Compact (Detailed), Compact (Minimal) or Expanded. Numbers are the **visible widget** in screen points (window size minus the 16 px shadow margin on each side; the same value on Retina and standard displays). Validation is whole numbers within the layout's limits (`cardLimits`, `parseCustomSize` in `electron/shared/windowSizes.ts`); out-of-range input is rejected with the allowed range. Applying uses the same clamp, persist and fit-to-screen code as dragging (`setLayoutSize` in `window.ts`) and tells you if the screen forced a smaller size. Limits (visible widget px): compact 320-528 x 428-868, minimal 320-528 x 264-388, expanded 788-1568 x 528-1068.

## Verified vs not verified
Verified (Linux, virtual display, real Electron + real X11 mouse events, aimed at where a person aims): resize on all three grips including the previous dead zones and the drag-region overlap, min/max enforcement, no clipping at minimum sizes, expanded mode fits on screen, custom sizes through the real Settings form, sizes (dragged and typed) persisting across a full quit and relaunch, reset, theme switching, 184 automated tests.

**macOS resizing: NOT verified.** It failed on a real Mac before the fixes above; the fixed build has not yet been tested there. Do not treat it as working until `docs/TESTING_5A.md` section 1 passes on a Mac.

**Not verified on real macOS or Windows (please test):**
- **Dragging the grips on macOS (known failing before the fix) and Windows**, with a real mouse and trackpad (cursor coordinates on high-DPI and mixed-DPI multi-monitor setups).
- Transparency rendering of each theme over real wallpapers; Windows 10 vs 11 differences.
- Window shadow/corner appearance, and always-on-top interplay with resizing.
- That `color-mix()` styling renders identically in the packaged Windows/macOS builds (Electron 44 supports it; not visually compared).

## Limits / not included
No blur/vibrancy/Mica (would need native effects and per-OS code), no wallpaper-layer embedding, no custom themes yet. Themes are fixed presets.
