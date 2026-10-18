/** True when running inside the Tauri shell rather than a plain browser tab. */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
