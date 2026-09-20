import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The SPA is built to dist/ and served by the Hono server in production
// (server/index.ts). During `pnpm dev`, Vite serves the front end on :5173 and
// proxies /api to the Hono server on :3000, so the browser never holds a key.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
  },
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
