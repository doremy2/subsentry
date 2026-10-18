import { BrowserWindow, screen, shell } from "electron";
import { join } from "node:path";
import type { WidgetMode } from "../../src/data/types";
import { WINDOW_SIZES } from "../shared/windowSizes";
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

export interface WidgetWindow {
  window: BrowserWindow;
  setMode(mode: WidgetMode): void;
  toggleVisibility(): void;
  show(): void;
  hide(): void;
}

export function createWidgetWindow(store: Store, options: { mode: WidgetMode; alwaysOnTop: boolean; isQuitting: () => boolean }): WidgetWindow {
  const device = deviceId();
  const size = WINDOW_SIZES[options.mode];
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

  return {
    window,
    setMode(mode) {
      const next = WINDOW_SIZES[mode];
      const [x = 0, y = 0] = window.getPosition();
      // Anchor the top-left corner; nudge back on-screen if growing would overflow.
      window.setBounds(clampToDisplay({ x, y, ...next }));
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
