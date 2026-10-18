import type { WidgetMode } from "../data/types";

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
  quit(): Promise<void>;
  showTestNotification(): Promise<void>;
  /** Subscribe to preference changes made outside the UI (tray menu). Returns unsubscribe. */
  onPreferencesChanged(listener: (preferences: import("../data/types").Preferences) => void): () => void;
}

const noop = async () => {};

export function createWindowService(): WindowService {
  const api = window.subsentry;
  if (!api) {
    return { platform: "web", setMode: noop, hide: noop, quit: noop, showTestNotification: noop, onPreferencesChanged: () => () => {} };
  }
  return {
    platform: api.platform,
    setMode: api.window.setMode,
    hide: api.window.hide,
    quit: api.app.quit,
    showTestNotification: api.system.showTestNotification,
    onPreferencesChanged: api.preferences.onChanged,
  };
}
