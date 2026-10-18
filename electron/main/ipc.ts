import { ipcMain, type IpcMainInvokeEvent, type WebContents } from "electron";
import { sanitizePreferencePatch } from "../../src/data/preferencesCodec";
import type { Preferences, WidgetMode } from "../../src/data/types";
import { parseSubscriptionInput } from "../../src/domain/validation";
import { CHANNELS, type IpcResult } from "../shared/api";
import type { Store } from "./db/store";

export interface IpcDependencies {
  store: Store;
  /** The only webContents allowed to call us. */
  trustedSender: () => WebContents | undefined;
  setMode(mode: WidgetMode): void;
  hideWindow(): void;
  quit(): void;
  /** Apply OS side effects of a preference change (always-on-top, login item, tray check mark). */
  applyPreferences(prefs: Preferences, patch: Partial<Preferences>): void;
  showTestNotification(): void;
}

/** Register a handler that rejects untrusted senders and returns errors as data. */
function handle<T>(channel: string, deps: IpcDependencies, fn: (...args: unknown[]) => T): void {
  ipcMain.handle(channel, (event: IpcMainInvokeEvent, ...args: unknown[]): IpcResult<T> => {
    if (event.sender !== deps.trustedSender()) return { ok: false, error: "Untrusted caller." };
    try {
      return { ok: true, value: fn(...args) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Unexpected error." };
    }
  });
}

function requireId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 100) throw new Error("Invalid id.");
  return value;
}

function requireInput(value: unknown) {
  const input = parseSubscriptionInput(value);
  if (!input) throw new Error("Invalid subscription data.");
  return input;
}

export function registerIpc(deps: IpcDependencies): void {
  const { store } = deps;
  handle(CHANNELS.subscriptionsList, deps, () => store.listSubscriptions());
  handle(CHANNELS.subscriptionsCreate, deps, (input) => store.createSubscription(requireInput(input)));
  handle(CHANNELS.subscriptionsUpdate, deps, (id, input) => store.updateSubscription(requireId(id), requireInput(input)));
  handle(CHANNELS.subscriptionsRemove, deps, (id) => store.removeSubscription(requireId(id)));

  handle(CHANNELS.preferencesLoad, deps, () => store.loadPreferences());
  handle(CHANNELS.preferencesSave, deps, (patchInput) => {
    const patch = sanitizePreferencePatch(patchInput);
    const prefs = store.savePreferences(patch);
    deps.applyPreferences(prefs, patch);
    return prefs;
  });

  handle(CHANNELS.windowSetMode, deps, (mode) => {
    if (mode !== "compact" && mode !== "expanded") throw new Error("Invalid mode.");
    deps.setMode(mode);
    store.savePreferences({ mode });
  });
  handle(CHANNELS.windowHide, deps, () => deps.hideWindow());
  handle(CHANNELS.appQuit, deps, () => deps.quit());
  handle(CHANNELS.systemTestNotification, deps, () => deps.showTestNotification());
}
