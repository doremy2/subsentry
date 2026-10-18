import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Renderer = the React UI. `npm run preview:web` serves it in a plain browser
// (in-memory demo data) for fast UI work without Electron.
/** Strict CSP for packaged builds only; the dev server needs inline scripts for hot reload. */
const productionCsp = {
  name: "subsentry-csp",
  apply: "build" as const,
  transformIndexHtml: (html: string) =>
    html.replace(
      "<head>",
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'" />`,
    ),
};

export default defineConfig({
  plugins: [react(), tailwindcss(), productionCsp],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
});
