import { defineConfig } from "vite";

// Preload must be CommonJS (sandboxed renderer). Forge names the output after the
// entry file, so electron/preload/preload.ts -> .vite/build/preload.cjs (see electron/main/window.ts).
export default defineConfig({
  build: { rollupOptions: { external: ["electron", /^node:/] } },
});
