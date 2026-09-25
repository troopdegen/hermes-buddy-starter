// Vercel Functions entry point (T10.3, B5/Wave 2), one of three.
//
// Vercel deploys any file under `api/` as a Function, mapped by its filename
// to the matching path (`api/health.ts` -> `/api/health`); a Web-standard
// `fetch` export works directly, and a Hono app is already shaped that way,
// so no `hono/vercel` adapter is needed. Sources:
// https://vercel.com/docs/functions/functions-api-reference ("fetch Web
// Standard" section) and https://hono.dev/docs/getting-started/vercel
// (exports a bare Hono instance directly).
//
// This is one of three thin entry files (health/chat/search) rather than a
// single `api/[[...route]].ts` catch-all: exact filename-to-path mapping is
// the one Vercel routing behavior documented unambiguously for a plain
// (non-Next.js) project, so each file's own path always matches its route
// with no dependency on rewrite behavior or bracket-filename catch-all
// support. All three share the same server/app.ts Hono instance, so the
// actual route handlers are defined once.
//
// Static assets (the Vite build in dist/) and the SPA fallback are handled by
// vercel.json's outputDirectory + rewrites, not by these files: filesystem
// matches (including these three function paths) already take precedence
// over vercel.json's rewrites, and Vercel never runs Hono's own serveStatic().

import { createApp } from "../server/app.js";

export default createApp();
