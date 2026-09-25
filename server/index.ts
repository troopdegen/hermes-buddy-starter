// Node entry point for the Hermes Buddy hackathon starter.
//
// Why a server at all: the seeded service keys (Nebius Token Factory, Tavily)
// cannot live in a client bundle, so the browser never sees them. server/app.ts
// (T10.1) holds the runtime-neutral Hono app (the /api/* routes); this file
// adds the Node-only pieces on top: `@hono/node-server`'s static file serving
// for the built SPA (dist/) plus an SPA fallback, and a `serve()` call that
// binds a port. Railway, Render, `pnpm start`, and scripts/dev-preview.mjs all
// depend on this file's path and on port 3000 / `PORT`, so it stays put even
// though Vercel (api/[[...route]].ts) and Cloudflare Workers (server/worker.ts)
// now have their own entry points onto the same server/app.ts.
//
// In the Tenki sandbox, provision.ts (the Agent Launcher) sources the shared
// volume .env directly before running `pnpm start` (there is no
// start-starter.sh in image v2; it was removed, and provision.ts inlines the
// equivalent `set -a; . .env; set +a` step instead).

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createApp } from "./app.js";

const PORT = Number(process.env.PORT ?? 3000);

const app = createApp();

// Static SPA (built to dist/) plus a catch-all that serves index.html so client
// routes resolve. Registered after the API routes so /api/* is never shadowed.
app.use("/*", serveStatic({ root: "./dist" }));
app.get("/*", serveStatic({ path: "./dist/index.html" }));

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`hermes-buddy-starter listening on http://localhost:${info.port}`);
});
