import { BrowserWindow, screen, shell } from "electron";
import { join } from "node:path";
import type { WidgetMode } from "../../src/data/types";
import { EMPTY_PLACEMENT, originOnCollapse, rememberAfterExpand, rememberBeforeExpand, type PlacementMemory, type Point } from "../shared/windowPlacement";
import { clampSize, DEFAULT_SIZES, LAYOUT_KEYS, layoutKeyFor, resizedSize, type LayoutKey, type ResizeAxis, type Size } from "../shared/windowSizes";
import type { Store } from "./db/store";
import { applyAlwaysOnTop, deviceId, widgetWindowOptions } from "./platform";

const SCREEN_MARGIN = 24;
const SAVE_DEBOUNCE_MS = 400;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** True if enough of the window's top strip is on some display to grab and drag it. */
function isReachable(x: number, y: number, width: number): boolean {
  return screen.getAllDisplays().some(({ workArea: a }) => x + width > a.x + 80 && x < a.x + a.width - 80 && y >= a.y && y < a.y + a.height - 80);
}

/** Keep `rect` fully inside the workArea of the display it overlaps most. */
function clampToDisplay(rect: Rect): Rect {
  const { workArea: a } = screen.getDisplayMatching(rect);
  return {
    ...rect,
    x: Math.max(a.x, Math.min(rect.x, a.x + a.width - rect.width)),
    y: Math.max(a.y, Math.min(rect.y, a.y + a.height - rect.height)),
  };
}

function defaultPosition(width: number): { x: number; y: number } {
  const { workArea: a } = screen.getPrimaryDisplay();
  return { x: a.x + a.width - width - SCREEN_MARGIN, y: a.y + SCREEN_MARGIN };
}

/** Room the window may occupy on the display it is on, measured from its current top-left corner. */
function roomFrom(rect: Rect): Size {
  const { workArea: a } = screen.getDisplayMatching(rect);
  return { width: a.x + a.width - rect.x, height: a.y + a.height - rect.y };
}

const RESIZE_TICK_MS = 16; // ~60 Hz
const RESIZE_MAX_MS = 30_000; // safety net if the renderer never reports mouse-up

/**
 * `SUBSENTRY_DEBUG_RESIZE=1 npm start` prints what the resize does in the terminal:
 *   no "[resize] begin" line  -> the press never reached the app (hit-testing / drag region / focus)
 *   "begin" but size unchanged -> the app tried, the OS window did not change (see the warning line)
 */
const debugResize = process.env["SUBSENTRY_DEBUG_RESIZE"] === "1";
const logResize = (...args: unknown[]) => debugResize && console.info("[resize]", ...args);

export interface WidgetWindow {
  window: BrowserWindow;
  setMode(mode: WidgetMode): void;
  /** Re-apply the size for the current layout (after the compact layout preference changed). */
  applyLayout(): void;
  /** Start a user resize; the window follows the cursor until `endResize`. */
  beginResize(axis: ResizeAxis): void;
  endResize(): void;
  /** Forget saved sizes and return the current layout to its default size. */
  resetSize(): void;
  /**
   * Set and remember the size of a layout (Settings > custom size). Same clamp + persist + fit-to-screen
   * path as dragging. Applies immediately if that layout is showing. Returns the window size that fits now.
   */
  setLayoutSize(layout: LayoutKey, size: Size): Size;
  /** The window size each layout will use (saved or default, limited to the screen). */
  getLayoutSizes(): Record<LayoutKey, Size>;
  toggleVisibility(): void;
  show(): void;
  hide(): void;
}

export function createWidgetWindow(store: Store, options: { mode: WidgetMode; alwaysOnTop: boolean; isQuitting: () => boolean }): WidgetWindow {
  const device = deviceId();
  const compactLayout = store.loadPreferences().compactLayout;
  const sizeFor = (key: LayoutKey, room?: Size): Size => clampSize(key, store.getWindowSize(device, key) ?? DEFAULT_SIZES[key], room);
  const size = sizeFor(layoutKeyFor(options.mode, compactLayout));
  const saved = store.getWindowPosition(device);
  const position = saved && isReachable(saved.x, saved.y, size.width) ? saved : defaultPosition(size.width);

  const window = new BrowserWindow({
    ...widgetWindowOptions(),
    ...clampToDisplay({ ...position, ...size }),
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  applyAlwaysOnTop(window, options.alwaysOnTop);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) void window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  else void window.loadFile(join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));

  // Never navigate away from the app; open external links in the user's browser.
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  window.once("ready-to-show", () => window.show());

  // Closing hides to the tray / menu bar; only an explicit Quit really closes.
  window.on("close", (event) => {
    if (!options.isQuitting()) {
      event.preventDefault();
      window.hide();
    }
  });

  // Remember where the user put it (debounced; `move` fires continuously while dragging).
  let timer: NodeJS.Timeout | undefined;
  window.on("move", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (window.isDestroyed()) return;
      const [x, y] = window.getPosition();
      if (x !== undefined && y !== undefined) store.setWindowPosition(device, { x, y });
    }, SAVE_DEBOUNCE_MS);
  });

  /** Fit the window to `key`'s saved (or default) size, anchored at `origin` (default: where it is now) and kept on screen. */
  const fitTo = (key: LayoutKey, origin?: Point) => {
    const [cx = 0, cy = 0] = window.getPosition();
    const { x, y } = origin ?? { x: cx, y: cy };
    // Size limit = the whole display (clampToDisplay then slides the window left/up to fit),
    // unlike a user drag, which keeps the top-left corner fixed and is limited by the room to its right/bottom.
    const { workArea } = screen.getDisplayMatching({ x, y, width: 1, height: 1 });
    const next = sizeFor(key, { width: workArea.width, height: workArea.height });
    window.setBounds(clampToDisplay({ x, y, ...next }));
  };

  /** Size of the display work area the widget is on. */
  const availableArea = (): Size => {
    const [x = 0, y = 0] = window.getPosition();
    const { workArea } = screen.getDisplayMatching({ x, y, width: 1, height: 1 });
    return { width: workArea.width, height: workArea.height };
  };

  // Expanding can slide the window to fit; collapsing puts it back unless the user moved it meanwhile.
  let currentMode: WidgetMode = options.mode;
  let placement: PlacementMemory = EMPTY_PLACEMENT;

  let resize: { timer: NodeJS.Timeout; stopAt: NodeJS.Timeout; key: LayoutKey } | null = null;

  const endResize = () => {
    if (!resize) return;
    clearInterval(resize.timer);
    clearTimeout(resize.stopAt);
    const { key } = resize;
    resize = null;
    if (window.isDestroyed()) return;
    const [width = 0, height = 0] = window.getSize();
    store.setWindowSize(device, key, { width, height }); // remembered per device and layout
    logResize(`end layout=${key} saved=${width}x${height}`);
  };
  window.on("closed", endResize);

  return {
    window,
    setMode(mode) {
      const key = layoutKeyFor(mode, store.loadPreferences().compactLayout);
      if (mode === currentMode) return fitTo(key);
      const [x = 0, y = 0] = window.getPosition();
      if (mode === "expanded") {
        placement = rememberBeforeExpand({ x, y });
        fitTo(key);
        const [px = 0, py = 0] = window.getPosition();
        placement = rememberAfterExpand(placement, { x: px, y: py });
      } else {
        const origin = originOnCollapse({ x, y }, placement);
        placement = EMPTY_PLACEMENT;
        fitTo(key, origin);
      }
      currentMode = mode;
    },
    applyLayout() {
      const prefs = store.loadPreferences();
      fitTo(layoutKeyFor(prefs.mode, prefs.compactLayout));
    },
    beginResize(axis) {
      endResize();
      const prefs = store.loadPreferences();
      const key = layoutKeyFor(prefs.mode, prefs.compactLayout);
      const [width = 0, height = 0] = window.getSize();
      const start = { size: { width, height }, cursor: screen.getCursorScreenPoint() };
      logResize(`begin axis=${axis} layout=${key} startSize=${width}x${height} cursor=${start.cursor.x},${start.cursor.y} resizable=${window.isResizable()}`);
      let ticks = 0;
      let ineffective = 0;
      // The window follows the OS cursor, so it works the same on Windows and macOS and
      // does not depend on native resize borders (unsupported on transparent Windows windows).
      const timer = setInterval(() => {
        if (window.isDestroyed()) return endResize();
        const cursor = screen.getCursorScreenPoint();
        const [x = 0, y = 0] = window.getPosition();
        const next = resizedSize(start.size, { dx: cursor.x - start.cursor.x, dy: cursor.y - start.cursor.y }, axis, key, roomFrom({ x, y, width: 1, height: 1 }));
        const [w = 0, h = 0] = window.getSize();
        ticks += 1;
        if (next.width !== w || next.height !== h) {
          window.setBounds({ x, y, ...next });
          const [aw = 0, ah = 0] = window.getSize();
          if (aw !== next.width || ah !== next.height) {
            ineffective += 1;
            if (ineffective === 10) logResize(`WARNING setBounds had no effect: requested ${next.width}x${next.height}, window is ${aw}x${ah}`);
          } else ineffective = 0;
          if (ticks === 1 || ticks % 30 === 0) logResize(`tick ${ticks}: cursor=${cursor.x},${cursor.y} -> ${aw}x${ah}`);
        }
      }, RESIZE_TICK_MS);
      resize = { timer, key, stopAt: setTimeout(endResize, RESIZE_MAX_MS) };
    },
    endResize,
    setLayoutSize(layout, requested) {
      endResize();
      store.setWindowSize(device, layout, clampSize(layout, requested)); // min/max only: remember the user's intent
      const prefs = store.loadPreferences();
      if (layoutKeyFor(prefs.mode, prefs.compactLayout) === layout) fitTo(layout);
      return sizeFor(layout, availableArea());
    },
    getLayoutSizes() {
      const area = availableArea();
      return Object.fromEntries(LAYOUT_KEYS.map((key) => [key, sizeFor(key, area)])) as Record<LayoutKey, Size>;
    },
    resetSize() {
      endResize();
      store.clearWindowSizes(device);
      this.applyLayout();
    },
    show() {
      window.show();
      window.focus();
    },
    hide: () => window.hide(),
    toggleVisibility() {
      if (window.isVisible()) window.hide();
      else {
        window.show();
        window.focus();
      }
    },
  };
}
