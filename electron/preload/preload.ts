import { contextBridge, ipcRenderer } from "electron";
import type { Preferences } from "../../src/data/types";
import { CHANNELS, type IpcResult, type SubSentryApi } from "../shared/api";

/** Call the main process and turn `{ok:false}` replies into thrown Errors. */
async function call<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, ...args)) as IpcResult<T>;
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

const api: SubSentryApi = {
  platform: process.platform as SubSentryApi["platform"],
  subscriptions: {
    list: () => call(CHANNELS.subscriptionsList),
    create: (input) => call(CHANNELS.subscriptionsCreate, input),
    update: (id, input) => call(CHANNELS.subscriptionsUpdate, id, input),
    remove: (id) => call(CHANNELS.subscriptionsRemove, id),
  },
  preferences: {
    load: () => call(CHANNELS.preferencesLoad),
    save: (patch) => call(CHANNELS.preferencesSave, patch),
    onChanged(listener) {
      const handler = (_event: unknown, prefs: Preferences) => listener(prefs);
      ipcRenderer.on(CHANNELS.preferencesChanged, handler);
      return () => ipcRenderer.removeListener(CHANNELS.preferencesChanged, handler);
    },
  },
  window: {
    setMode: (mode) => call(CHANNELS.windowSetMode, mode),
    hide: () => call(CHANNELS.windowHide),
    beginResize: (axis) => call(CHANNELS.windowResizeStart, axis),
    endResize: () => call(CHANNELS.windowResizeEnd),
    resetSize: () => call(CHANNELS.windowResetSize),
    setLayoutSize: (layout, size) => call(CHANNELS.windowSetLayoutSize, layout, size),
    getSizes: () => call(CHANNELS.windowGetSizes),
  },
  app: { quit: () => call(CHANNELS.appQuit) },
  system: { showTestNotification: () => call(CHANNELS.systemTestNotification) },
  detection: { analyze: (transactions) => call(CHANNELS.detectionAnalyze, transactions) },
};

contextBridge.exposeInMainWorld("subsentry", api);
