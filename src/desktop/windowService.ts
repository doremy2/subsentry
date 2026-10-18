import type { WidgetMode, WindowPosition } from "../data/types";
import { isTauri } from "./runtime";

/**
 * Everything the app needs from the native window. The UI calls this interface
 * and never imports @tauri-apps/api/window directly. In a plain browser all
 * methods are harmless no-ops, so `npm run dev` still works for UI work.
 */
export interface WindowService {
  /** Move the window to a saved position, if it is still on a connected monitor. */
  restorePosition(position: WindowPosition | null): Promise<void>;
  /** Resize for the given mode, keeping the top-left corner and staying on-screen. */
  applyMode(mode: WidgetMode): Promise<void>;
  setAlwaysOnTop(enabled: boolean): Promise<void>;
  show(): Promise<void>;
  /** Hide to the system tray; the tray icon brings it back. */
  hide(): Promise<void>;
  quit(): Promise<void>;
  /** Called (debounced) after the user drags the window. Returns an unsubscribe. */
  onMoved(listener: (position: WindowPosition) => void): Promise<() => void>;
}

/** Logical (DPI-independent) window sizes. Include 16px of transparent margin per side for the CSS shadow. */
export const WINDOW_SIZES: Record<WidgetMode, { width: number; height: number }> = {
  compact: { width: 392, height: 548 },
  expanded: { width: 1012, height: 692 },
};

const MOVE_DEBOUNCE_MS = 400;

const browserWindowService: WindowService = {
  restorePosition: async () => {},
  applyMode: async () => {},
  setAlwaysOnTop: async () => {},
  show: async () => {},
  hide: async () => {},
  quit: async () => {},
  onMoved: async () => () => {},
};

async function createTauriWindowService(): Promise<WindowService> {
  const { getCurrentWindow, currentMonitor, availableMonitors, PhysicalPosition, LogicalSize } = await import("@tauri-apps/api/window");
  const { invoke } = await import("@tauri-apps/api/core");
  const win = getCurrentWindow();

  /** Is at least a usable chunk of the window's title area visible on some monitor? */
  async function isOnScreen(x: number, y: number): Promise<boolean> {
    const monitors = await availableMonitors();
    const margin = 80;
    return monitors.some(({ position: p, size: s }) => x > p.x - margin && x < p.x + s.width - margin && y >= p.y && y < p.y + s.height - margin);
  }

  return {
    async restorePosition(position) {
      if (position && (await isOnScreen(position.x, position.y))) {
        await win.setPosition(new PhysicalPosition(position.x, position.y));
      }
    },

    async applyMode(mode) {
      const size = WINDOW_SIZES[mode];
      await win.setSize(new LogicalSize(size.width, size.height));
      // Growing can push the window past the screen edge; nudge it back in.
      const monitor = await currentMonitor();
      if (!monitor) return;
      const scale = await win.scaleFactor();
      const pos = await win.outerPosition();
      const width = size.width * scale;
      const height = size.height * scale;
      const x = Math.max(monitor.position.x, Math.min(pos.x, monitor.position.x + monitor.size.width - width));
      const y = Math.max(monitor.position.y, Math.min(pos.y, monitor.position.y + monitor.size.height - height));
      if (x !== pos.x || y !== pos.y) await win.setPosition(new PhysicalPosition(Math.round(x), Math.round(y)));
    },

    setAlwaysOnTop: (enabled) => win.setAlwaysOnTop(enabled),
    show: async () => {
      await win.show();
      await win.setFocus();
    },
    hide: () => win.hide(),
    quit: () => invoke("quit_app"),

    async onMoved(listener) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const unlisten = await win.onMoved(({ payload }) => {
        clearTimeout(timer);
        timer = setTimeout(() => listener({ x: payload.x, y: payload.y }), MOVE_DEBOUNCE_MS);
      });
      return () => {
        clearTimeout(timer);
        unlisten();
      };
    },
  };
}

export async function createWindowService(): Promise<WindowService> {
  return isTauri() ? createTauriWindowService() : browserWindowService;
}
