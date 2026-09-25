# Nebius x NVIDIA AI Hackathon Starter

A full-stack starter for the Nebius x NVIDIA Global AI Hackathon (submissions close 2026-10-30 10:00 PT / 17:00 UTC). Vite + React on the front end, a small Hono server on the back. It ships wired to the Nebius Token Factory and Tavily so an entry built on it is compliant with the hackathon's "runs on Nebius" requirement out of the box.

## For judges

This is a template repo, not a finished submission: participants fork or copy it and build their entry on top. The template itself demonstrates the required wiring: a server-side call to Nebius Token Factory's OpenAI-compatible chat completions endpoint using an NVIDIA Nemotron model (`server/app.ts`, route `POST /api/chat`), and a Tavily-backed web search route (`POST /api/search`) that a participant can make central to their product for the Best Use of Tavily bonus prize. Keys never reach the browser: the Hono server holds them server-side and the client only calls `/api/*`.

## What it is

- Front end: Vite + React (`src/`), built to `dist/` for production.
- Back end: a runtime-neutral Hono app (`server/app.ts`) holding the two API routes (`/api/chat` to Nebius Token Factory, `/api/search` to Tavily) plus `/api/health`, with one thin entry point per host on top of it: `server/index.ts` (Node, via `@hono/node-server`, for Railway, Render, and local dev), `api/health.ts` / `api/chat.ts` / `api/search.ts` (Vercel Functions), and `server/worker.ts` (Cloudflare Workers).
- During `pnpm dev` the two run separately: Vite on `:5173`, the API on `:3000`, with `/api` proxied from Vite to the API so the front end never needs to know the API's real port.

## The four keys

Three are service keys this app uses directly. The fourth (Tenki) only matters if you are running inside a Tenki sandbox via the Agent Launcher; the starter itself never sees it.

- `NEBIUS_API_KEY`: Nebius Token Factory (inference). Get $25 in credits by filling out the [Nebius promo form](https://nebius.com/promo-code?utm_promo_event_code=2026-devpost-global-ai-hack&utm_promo_code_type=Token_Factory&utm_promo_activation_code=NEBIUS-DEVPOST-GLOBAL26) with activation code `NEBIUS-DEVPOST-GLOBAL26`. A second $25 in Token Factory credit (plus Tavily and other credit) comes from joining the free [Nebius Builders Program](https://dev.nebius.com/builders).
- `TAVILY_API_KEY`: Tavily web search. Use promo code `BBDEVPOST` for Tavily credit (per the hackathon's build-session resources), or claim Tavily credit through the Builders Program above.
- `TELEGRAM_BOT_TOKEN`: only needed if you also run the Hermes agent alongside this starter (the Agent Launcher provisions it for you). The starter's own code never reads it.
- Tenki key: stays in the Agent Launcher, never in this repo or its `.env`.

Copy `.env.example` to `.env` and fill in `NEBIUS_API_KEY` and `TAVILY_API_KEY`. The tracked file holds placeholders only; never commit a real key.

## Run it locally

```bash
pnpm install
pnpm build      # builds the SPA into dist/
pnpm start      # Hono serves the SPA + API on http://localhost:3000
```

For a fast edit loop, `pnpm dev` runs Vite on `:5173` and proxies `/api` to the Hono server on `:3000` (start the server in a second terminal with `pnpm start`).

Inside a Tenki sandbox (Agent Launcher Preview), use `pnpm dev:preview` instead, which starts both processes together with the settings the Preview proxy needs. See `AGENTS.md` for details; that command is for the sandboxed Preview, not for local development.

## Endpoints

- `GET /api/health`: reports the configured model and whether each key is present. Never returns a key value.
- `POST /api/chat`: proxies an OpenAI-shaped chat completion to Nebius Token Factory (`{NEBIUS_BASE_URL}/v1/chat/completions`, default model `nvidia/nemotron-3-super-120b-a12b`). Body: `{ "messages": [{ "role": "user", "content": "..." }] }`. Optional: `model`, `temperature`, `max_tokens`.
- `POST /api/search`: proxies a Tavily search. Body: `{ "query": "..." }`. Optional: `maxResults`, `searchDepth` (`basic` or `advanced`). Missing or empty `query` returns 400.

## Compliance

The hackathon's rules define "runs on Nebius Token Factory or Nebius AI Cloud" as the project making "a runtime call to the Token Factory inference API" (or running on Nebius AI Cloud compute), and require at least one NVIDIA open source model (Nemotron, GR00T, Cosmos, or Sonic). This starter's `/api/chat` route makes that runtime call by default against `nvidia/nemotron-3-super-120b-a12b` on `https://api.tokenfactory.nebius.com`, so a submission built on it satisfies the requirement without extra wiring, regardless of where you host the app. Confirm the exact Nemotron model id available to your account against `GET https://api.tokenfactory.nebius.com/v1/models` and override with the `NEBIUS_MODEL` environment variable if needed.

## The Tavily-powered feature

`POST /api/search` is a ready-to-use, server-side Tavily search call. The Best Use of Tavily bonus prize requires "a functional, runtime call to the Tavily API as part of your solution": to be a real contender for it, make search a load-bearing part of your product (for example, grounding the chat model's answers in fresh search results) rather than a decorative extra, and say so explicitly in your submission video.

## Deploy your Demo

The hackathon requires a permanent Demo URL that stays up and testable through the end of judging (2026-12-15), separate from any temporary preview. All four hosts below deploy this starter unmodified: `server/app.ts` holds the runtime-neutral Hono app, and each host has its own thin entry point on top of it (`server/index.ts` for Node, `api/health.ts` / `api/chat.ts` / `api/search.ts` for Vercel, `server/worker.ts` for Cloudflare Workers). Whichever host you pick, set `NEBIUS_API_KEY` and `TAVILY_API_KEY` on that host so the deployed Demo keeps making real Token Factory (and Tavily) calls; never commit them to the repo. After deploying, confirm compliance with `curl https://<your-demo-url>/api/health`: it should report the configured model and that the Nebius key is present.

- **Railway**: `railway init --name <a-name>`, then `railway up --detach` (build command `pnpm build`, start command `pnpm start` are Railway's defaults for a Node project; set them explicitly in the dashboard if it does not detect them). Add the keys with `railway variable set NEBIUS_API_KEY="..."` and `railway variable set TAVILY_API_KEY="..."`, then `railway domain` to get a public URL.
- **Render**: push this repo to GitHub, then `render services create --name <a-name> --repo <your-repo-url> --branch main --runtime node --build-command "pnpm install && pnpm build" --start-command "pnpm start" --plan starter --env-var NEBIUS_API_KEY="..." --env-var TAVILY_API_KEY="..."`. Render assigns a `*.onrender.com` URL.
- **Vercel**: `vercel link --yes`, then `vercel env add NEBIUS_API_KEY production` and `vercel env add TAVILY_API_KEY production` (paste the value when prompted, or pipe it: `printf '%s' "$NEBIUS_API_KEY" | vercel env add NEBIUS_API_KEY production`), then `vercel deploy --prod --yes`. `vercel.json` builds the Vite SPA to `dist/` and routes `/api/health`, `/api/chat`, `/api/search` to the three functions under `api/`; no adapter is needed, Vercel Functions accept a Web-standard `fetch` export directly and a Hono app is already shaped that way ([Hono on Vercel](https://hono.dev/docs/getting-started/vercel), [Vercel Functions API reference](https://vercel.com/docs/functions/functions-api-reference)).
- **Cloudflare**: `pnpm build`, then `wrangler deploy` (never `wrangler pages`: this deploys a Worker, not Pages). Set the keys as Worker secrets: `printf '%s' "$NEBIUS_API_KEY" | wrangler secret put NEBIUS_API_KEY` and the same for `TAVILY_API_KEY`; each `secret put` redeploys immediately, so no second `wrangler deploy` is needed. `wrangler.jsonc` serves the Vite build from `dist/` as static assets and routes `/api/*` to `server/worker.ts` via `run_worker_first`, per Cloudflare's [Workers static assets](https://developers.cloudflare.com/workers/static-assets/) docs; `server/worker.ts` exports the Hono app directly, per [Hono's Cloudflare Workers guide](https://hono.dev/docs/getting-started/cloudflare-workers). `wrangler deploy` prints a `*.workers.dev` URL.

## License

MIT. See `LICENSE`. The hackathon requires the license to be detectable and visible at the top of the repository page (in the About section) on GitHub, GitLab, or Bitbucket. GitHub auto-detects a standard `LICENSE` file at the repo root, so keeping this file in place and public is enough; if it does not show up, confirm the "License" line under the repo's About panel points at it.
