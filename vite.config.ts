import fs from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// PREVIEW_MODE is set only by `pnpm dev:preview` (scripts/dev-preview.mjs),
// which defaults it to "poll" when unset. Plain `pnpm dev` never sets it, so
// local development keeps Vite's normal localhost-only host check and
// websocket HMR unchanged.
const PREVIEW_MODE = process.env.PREVIEW_MODE;

// Path is frozen in the orchestrator contract
// (packages/agent-launcher-orchestrator/src/pack/preview.ts,
// PREVIEW_ACTIVITY_FILE): the launcher's watchdog (B4) polls this file's
// mtime, plus the newest file under the app directory, to decide whether the
// Preview is idle and can be put to sleep.
const PREVIEW_ACTIVITY_FILE = "/tmp/buddi-preview-activity";

function touchActivityFile() {
  const now = new Date();
  fs.utimes(PREVIEW_ACTIVITY_FILE, now, now, (err) => {
    if (err) {
      fs.open(PREVIEW_ACTIVITY_FILE, "w", (openErr, fd) => {
        if (!openErr && fd !== undefined) fs.close(fd, () => {});
      });
    }
  });
}

// Activity plugin (T5.4): every request that is not a /__preview/* request
// (the poll plugin's own version endpoint, or a future preview-only path)
// touches the activity file above. Only wired in when PREVIEW_MODE is set, so
// it never runs during plain `pnpm dev` or `pnpm build`.
function previewActivityPlugin(): Plugin {
  return {
    name: "buddi-preview-activity",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url && !req.url.startsWith("/__preview")) {
          touchActivityFile();
        }
        next();
      });
    },
  };
}

// Poll-mode fallback for the Tenki Preview. The 2026-09-24 spike
// (workstreams/agent-launcher-v1/docs/research/tenki-preview-hmr-spike.md)
// found the preview proxy returns 403 on a plain HTTP fetch until
// server.allowedHosts covers the preview host, and the HMR websocket upgrade
// never completed even after that fix was attempted; the spike's own
// restart-verification gap leaves "hmr" unproven, so this plugin gives a
// polling fallback that works over plain HTTP. It serves a version counter
// that increments on every file-watcher event and injects a small client
// script that polls the counter about once a second and reloads the page
// when it changes.
function previewPollPlugin(): Plugin {
  let version = 0;
  const bump = () => {
    version += 1;
  };
  return {
    name: "buddi-preview-poll",
    configureServer(server) {
      server.watcher.on("change", bump);
      server.watcher.on("add", bump);
      server.watcher.on("unlink", bump);
      server.middlewares.use("/__preview/version", (_req, res) => {
        res.setHeader("content-type", "application/json");
        res.setHeader("cache-control", "no-store");
        res.end(JSON.stringify({ version }));
      });
    },
    transformIndexHtml() {
      return [
        {
          tag: "script",
          injectTo: "body",
          children: `(function () {
  var last = null;
  setInterval(function () {
    fetch("/__preview/version", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (last === null) { last = data.version; return; }
        if (data.version !== last) { location.reload(); }
      })
      .catch(function () {});
  }, 1000);
})();`,
        },
      ];
    },
  };
}

const previewMode = PREVIEW_MODE === "hmr" ? "hmr" : PREVIEW_MODE ? "poll" : null;

// The SPA is built to dist/ and served by the Hono server in production
// (server/index.ts). During `pnpm dev`, Vite serves the front end on :5173 and
// proxies /api to the Hono server on :3000, so the browser never holds a key.
// `pnpm dev:preview` (previewMode set) additionally binds Vite to 0.0.0.0,
// allows the Tenki preview host, and switches HMR to either the "hmr" or
// "poll" strategy above.
export default defineConfig({
  plugins: [
    react(),
    ...(previewMode ? [previewActivityPlugin()] : []),
    ...(previewMode === "poll" ? [previewPollPlugin()] : []),
  ],
  build: {
    outDir: "dist",
  },
  server: {
    ...(previewMode ? { host: "0.0.0.0" as const, allowedHosts: [".sb.tenki.sh"] } : {}),
    ...(previewMode === "hmr"
      ? { hmr: { protocol: "wss", clientPort: 443 } }
      : previewMode === "poll"
        ? { hmr: false as const }
        : {}),
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
