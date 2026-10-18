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
Electron cannot reliably resize *transparent frameless* windows from their native edges on Windows. So resizing is ours: the grips in `ResizeGrips.tsx` tell the main process to start/stop; `window.ts` follows `screen.getCursorScreenPoint()` at ~60 Hz and calls `setBounds` with `resizedSize()` (pure, unit-tested). Same code path on macOS and Windows. A 60 s safety timer ends a drag if the renderer never reports mouse-up.

## Verified vs not verified
Verified (Linux, virtual display, real Electron + real X mouse events, dev and packaged builds): resize on all three grips, min/max enforcement, no clipping at minimum sizes, expanded mode fits on screen, sizes persist per layout, reset, theme switching, CSP-safe styling, 143 automated tests.

**Not verified on real macOS or Windows (please test):**
- Dragging the grips with a real mouse/trackpad on both OSes (cursor coordinates on high-DPI and mixed-DPI multi-monitor setups).
- Transparency rendering of each theme over real wallpapers; Windows 10 vs 11 differences.
- Window shadow/corner appearance, and always-on-top interplay with resizing.
- That `color-mix()` styling renders identically in the packaged Windows/macOS builds (Electron 44 supports it; not visually compared).

## Limits / not included
No blur/vibrancy/Mica (would need native effects and per-OS code), no wallpaper-layer embedding, no custom themes yet. Themes are fixed presets.
