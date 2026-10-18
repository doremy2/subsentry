import type { SubSentryApi } from "../electron/shared/api";

declare global {
  interface Window {
    /** Present only inside Electron; undefined in a plain browser preview. */
    subsentry?: SubSentryApi;
  }
}
