import type { WidgetMode } from "../data/types";
import { DEFAULT_SIZES, type LayoutKey, type Size } from "../../electron/shared/windowSizes";

/**
 * What the UI needs from the native window. Implemented over Electron IPC;
 * harmless no-ops in a plain browser so `npm run preview:web` still works.
 * Window position is handled entirely in the main process (per device).
 */
export interface WindowService {
  readonly platform: "darwin" | "win32" | "linux" | "web";
  setMode(mode: WidgetMode): Promise<void>;
  /** Hide to the tray / menu bar. */
  hide(): Promise<void>;
  /** Resize grips: the main process moves the window edge with the cursor between begin and end. */
  beginResize(axis: "both" | "x" | "y"): Promise<void>;
  endResize(): Promise<void>;
  resetSize(): Promise<void>;
  /** Custom size: sets and remembers a layout's window size; resolves with the size that fits now. */
  setLayoutSize(layout: LayoutKey, size: Size): Promise<Size>;
  getLayoutSizes(): Promise<Record<LayoutKey, Size>>;
  quit(): Promise<void>;
  showTestNotification(): Promise<void>;
  /** Subscribe to preference changes made outside the UI (tray menu). Returns unsubscribe. */
  onPreferencesChanged(listener: (preferences: import("../data/types").Preferences) => void): () => void;
}

const noop = async () => {};

export function createWindowService(): WindowService {
  const api = window.subsentry;
  if (!api) {
    return { platform: "web", setMode: noop, hide: noop, beginResize: noop, endResize: noop, resetSize: noop, setLayoutSize: async (_layout, size) => size, getLayoutSizes: async () => DEFAULT_SIZES, quit: noop, showTestNotification: noop, onPreferencesChanged: () => () => {} };
  }
  return {
    platform: api.platform,
    setMode: api.window.setMode,
    hide: api.window.hide,
    beginResize: api.window.beginResize,
    endResize: api.window.endResize,
    resetSize: api.window.resetSize,
    setLayoutSize: api.window.setLayoutSize,
    getLayoutSizes: api.window.getSizes,
    quit: api.app.quit,
    showTestNotification: api.system.showTestNotification,
    onPreferencesChanged: api.preferences.onChanged,
  };
}
