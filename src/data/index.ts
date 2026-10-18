import { isTauri } from "../desktop/runtime";
import { createMemoryServices } from "./memory/memoryServices";
import type { DataServices } from "./types";

export * from "./types";

/** SQLite inside the desktop app; in-memory demo data when previewed in a plain browser. */
export async function createDataServices(): Promise<DataServices> {
  if (!isTauri()) return createMemoryServices();
  const { createSqliteServices } = await import("./sqlite/sqliteServices");
  return createSqliteServices();
}
