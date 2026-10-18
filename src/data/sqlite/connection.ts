import Database from "@tauri-apps/plugin-sql";
import { DataError } from "../types";

/**
 * File name of the SQLite database inside the app data directory. The schema
 * is created by migrations registered on the Rust side (src-tauri/src/migrations.rs),
 * which run when the connection is first opened.
 */
export const DATABASE_URL = "sqlite:subsentry.db";

export async function openDatabase(): Promise<Database> {
  try {
    return await Database.load(DATABASE_URL);
  } catch (cause) {
    throw new DataError("Could not open the local database.", { cause });
  }
}

export function wrap<T>(action: string, work: Promise<T>): Promise<T> {
  return work.catch((cause: unknown) => {
    throw cause instanceof DataError ? cause : new DataError(`Database error while ${action}.`, { cause });
  });
}
