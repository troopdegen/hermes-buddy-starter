// Vercel Functions entry point (T10.3, B5/Wave 2), one of three: see
// api/health.ts for the full decision writeup (filename-to-path mapping,
// docs cited there). Maps `/api/search` to server/app.ts's Hono instance.

import { createApp } from "../server/app.js";

export default createApp();
