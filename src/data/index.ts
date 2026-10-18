import { createIpcServices } from "./ipc/ipcServices";
import { createMemoryServices } from "./memory/memoryServices";
import type { DataServices } from "./types";

export * from "./types";

/** SQLite (via the Electron main process) in the desktop app; in-memory demo data in a plain browser preview. */
export function createDataServices(): DataServices {
  return window.subsentry ? createIpcServices(window.subsentry) : createMemoryServices();
}
