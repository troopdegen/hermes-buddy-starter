// Cloudflare Workers entry point (T10.4, B5/Wave 2).
//
// Hono's own current Cloudflare Workers guide exports the Hono instance as
// the module's default export directly (no wrapper): a Hono app already
// implements the `{ fetch(request, env, ctx) }` shape Workers expects.
// Source: https://hono.dev/docs/getting-started/cloudflare-workers.
// `env` (NEBIUS_API_KEY, TAVILY_API_KEY, and the optional base-url/model
// overrides) is set as Worker secrets/vars (`wrangler secret put`) and read
// per request via `c.env` inside server/app.ts, per
// https://developers.cloudflare.com/workers/static-assets/ ("Environment &
// Secrets Access ... through c.env rather than process.env").
//
// Static assets (the Vite build in dist/) and the SPA fallback are configured
// in wrangler.jsonc's `assets` block, not here: this Worker only ever sees
// `/api/*` requests (wrangler.jsonc routes everything else straight to the
// static assets binding via `run_worker_first`), so this file has nothing to
// add beyond the app itself.

import { createApp } from "./app.js";

export default createApp();
