import { DETECTION_LIMITS } from "../domain/detection/types";

/** A problem with the chosen file, phrased for the user. */
export class ImportFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportFileError";
  }
}

/**
 * Read a user-selected file as text, entirely in memory on this device. Handles
 * UTF-8 (with or without BOM) and falls back to Windows-1252, which older
 * Windows bank exports use. Same code path on Windows and macOS.
 */
export async function readCsvFile(file: File): Promise<string> {
  if (file.size === 0) throw new ImportFileError("That file is empty.");
  if (file.size > DETECTION_LIMITS.maxFileBytes) {
    throw new ImportFileError(`That file is too large (limit ${DETECTION_LIMITS.maxFileBytes / 1024 / 1024} MB).`);
  }
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}
