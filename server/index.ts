// Hono server for the Hermes Buddy hackathon starter.
//
// Why a server at all: the seeded service keys (Nebius Token Factory, Tavily)
// cannot live in a client bundle, so the browser never sees them. This server
// holds the keys, serves the built SPA (dist/), and proxies the two key-bearing
// calls: /api/chat (Nebius Token Factory + a Nemotron model) and /api/search
// (Tavily). Keys are read server-side from the environment only.
//
// In the Tenki sandbox, start-starter.sh sources $HERMES_HOME/.env (the same
// volume .env Hermes uses) so NEBIUS_API_KEY / TAVILY_API_KEY are shared.

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

const PORT = Number(process.env.PORT ?? 3000);

// Nebius Token Factory is OpenAI-compatible. The chat completions endpoint is
// `${NEBIUS_BASE_URL}/v1/chat/completions`. The default model is a Nemotron
// (NVIDIA) model on Nebius Token Factory, which is what makes a submission
// built on this starter Nebius x NVIDIA compliant out of the box.
const NEBIUS_BASE_URL = (process.env.NEBIUS_BASE_URL ?? "https://api.tokenfactory.nebius.com").replace(/\/$/, "");
const NEBIUS_MODEL = process.env.NEBIUS_MODEL ?? "nvidia/nemotron-3-super-120b-a12b";
const NEBIUS_API_KEY = process.env.NEBIUS_API_KEY ?? "";

const TAVILY_BASE_URL = (process.env.TAVILY_BASE_URL ?? "https://api.tavily.com").replace(/\/$/, "");
const TAVILY_API_KEY = process.env.TAVILY_API_KEY ?? "";

const app = new Hono();

// Health: report the configured model and whether each key is present. Never
// return the key value itself.
app.get("/api/health", (c) =>
  c.json({
    status: "ok",
    model: NEBIUS_MODEL,
    baseUrl: NEBIUS_BASE_URL,
    keys: {
      nebius: NEBIUS_API_KEY.length > 0,
      tavily: TAVILY_API_KEY.length > 0,
    },
  }),
);

// Chat: proxy an OpenAI-shaped chat completion to Nebius Token Factory. With an
// absent or invalid key the upstream returns 401, which we relay verbatim: that
// 401 proves the URL and auth path are wired correctly.
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

  const upstream = await fetch(`${NEBIUS_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${NEBIUS_API_KEY}`,
    },
    body: JSON.stringify({
      model: typeof body.model === "string" ? body.model : NEBIUS_MODEL,
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

  const upstream = await fetch(`${TAVILY_BASE_URL}/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
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

// Static SPA (built to dist/) plus a catch-all that serves index.html so client
// routes resolve. Placed after the API routes so /api/* is never shadowed.
app.use("/*", serveStatic({ root: "./dist" }));
app.get("/*", serveStatic({ path: "./dist/index.html" }));

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`hermes-buddy-starter listening on http://localhost:${info.port}`);
});
