import type { SubSentryApi } from "../../../electron/shared/api";
import type { DataServices } from "../types";

/**
 * Repositories backed by the Electron main process (SQLite lives there).
 * The renderer never touches the database directly.
 */
export function createIpcServices(api: SubSentryApi): DataServices {
  return {
    subscriptions: api.subscriptions,
    preferences: { load: api.preferences.load, save: api.preferences.save },
  };
}
