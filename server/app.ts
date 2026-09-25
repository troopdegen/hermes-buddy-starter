// Runtime-neutral Hono app for the Nebius x NVIDIA hackathon starter.
//
// Decision this encodes (T10.1, B5/Wave 2): the routes (`/api/health`,
// `/api/chat`, `/api/search`) used to live directly in server/index.ts,
// coupled to `@hono/node-server`. Pulling them out into a plain `Hono`
// instance with no `node:*` or `@hono/node-server` imports lets the same
// app object be served by three different entry points: server/index.ts
// (Node, Railway/Render/local), server/worker.ts (Cloudflare Workers), and
// api/[[...route]].ts (Vercel Functions). Behavior and response shapes are
// unchanged from the pre-split server/index.ts.
//
// Env values (the two service keys and their optional base-url/model
// overrides) are read per request from Hono's `c.env` (populated by
// Workers bindings/secrets and by Vercel's Node runtime) with a
// `process.env` fallback for Node hosts where `c.env` is undefined. Reading
// per request, rather than capturing once at module load, matters for
// Workers: `wrangler secret put` values are only visible through `c.env`,
// and a module-scope read would freeze whatever `process.env` held (nothing,
// on Workers) at cold start.

import { Hono } from "hono";

export interface Env {
  NEBIUS_API_KEY?: string;
  NEBIUS_BASE_URL?: string;
  NEBIUS_MODEL?: string;
  TAVILY_API_KEY?: string;
  TAVILY_BASE_URL?: string;
}

const DEFAULT_NEBIUS_BASE_URL = "https://api.tokenfactory.nebius.com";
const DEFAULT_NEBIUS_MODEL = "nvidia/nemotron-3-super-120b-a12b";
const DEFAULT_TAVILY_BASE_URL = "https://api.tavily.com";

// Reads one env value at request time: Workers/Vercel bindings first
// (`c.env`, populated from `wrangler secret put` or the host's environment),
// then Node's `process.env` (Railway, Render, `pnpm start` locally). Guarded
// with `typeof process` since `process` is not defined in the Workers
// runtime unless `nodejs_compat` is on, which this app does not require.
function readEnv(env: Env | undefined, key: keyof Env): string {
  const fromBindings = env?.[key];
  if (typeof fromBindings === "string" && fromBindings.length > 0) return fromBindings;
  if (typeof process !== "undefined" && process.env && typeof process.env[key] === "string") {
    return process.env[key] as string;
  }
  return "";
}

export function createApp() {
  const app = new Hono<{ Bindings: Env }>();

  // Health: report the configured model and whether each key is present.
  // Never return the key value itself.
  app.get("/api/health", (c) => {
    const model = readEnv(c.env, "NEBIUS_MODEL") || DEFAULT_NEBIUS_MODEL;
    const baseUrl = (readEnv(c.env, "NEBIUS_BASE_URL") || DEFAULT_NEBIUS_BASE_URL).replace(/\/$/, "");
    const nebiusKey = readEnv(c.env, "NEBIUS_API_KEY");
    const tavilyKey = readEnv(c.env, "TAVILY_API_KEY");
    return c.json({
      status: "ok",
      model,
      baseUrl,
      keys: {
        nebius: nebiusKey.length > 0,
        tavily: tavilyKey.length > 0,
      },
    });
  });

  // Chat: proxy an OpenAI-shaped chat completion to Nebius Token Factory.
  // With an absent or invalid key the upstream returns 401, which we relay
  // verbatim: that 401 proves the URL and auth path are wired correctly.
  app.post("/api/chat", async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid JSON body" }, 400);
    }
    const messages = body?.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return c.json({ error: "messages must be a non-empty array of { role, content }" }, 400);
    }

    const baseUrl = (readEnv(c.env, "NEBIUS_BASE_URL") || DEFAULT_NEBIUS_BASE_URL).replace(/\/$/, "");
    const model = readEnv(c.env, "NEBIUS_MODEL") || DEFAULT_NEBIUS_MODEL;
    const apiKey = readEnv(c.env, "NEBIUS_API_KEY");

    const upstream = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: typeof body.model === "string" ? body.model : model,
        messages,
        stream: false,
        ...(body.temperature != null ? { temperature: body.temperature } : {}),
        ...(body.max_tokens != null ? { max_tokens: body.max_tokens } : {}),
      }),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  });

  // Search: proxy a Tavily search. Validate input before spending a call.
  app.post("/api/search", async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid JSON body" }, 400);
    }
    const query = body?.query;
    if (typeof query !== "string" || query.trim().length === 0) {
      return c.json({ error: "query is required and must be a non-empty string" }, 400);
    }

    const baseUrl = (readEnv(c.env, "TAVILY_BASE_URL") || DEFAULT_TAVILY_BASE_URL).replace(/\/$/, "");
    const apiKey = readEnv(c.env, "TAVILY_API_KEY");

    const upstream = await fetch(`${baseUrl}/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: typeof body.maxResults === "number" ? body.maxResults : 5,
        search_depth: body.searchDepth === "advanced" ? "advanced" : "basic",
      }),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  });

  return app;
}
