import { defineConfig } from "vite";
import { builtinModules } from "node:module";

// Electron main process: bundle our code and npm deps (the packaged app ships no node_modules);
// only Node/Electron built-ins stay external.
// Output must be named main.js to match package.json "main".
export default defineConfig({
  build: {
    lib: { entry: "electron/main/index.ts", formats: ["cjs"], fileName: () => "main.js" },
    rollupOptions: {
      external: ["electron", /^node:/, ...builtinModules],
    },
  },
});
