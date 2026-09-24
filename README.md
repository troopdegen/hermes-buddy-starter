# Nebius x NVIDIA AI Hackathon Starter

A full-stack starter for the Nebius x NVIDIA Global AI Hackathon (submissions close 2026-10-30 10:00 PT / 17:00 UTC). Vite + React on the front end, a small Hono server on the back. It ships wired to the Nebius Token Factory and Tavily so an entry built on it is compliant with the hackathon's "runs on Nebius" requirement out of the box.

## For judges

This is a template repo, not a finished submission: participants fork or copy it and build their entry on top. The template itself demonstrates the required wiring: a server-side call to Nebius Token Factory's OpenAI-compatible chat completions endpoint using an NVIDIA Nemotron model (`server/index.ts`, route `POST /api/chat`), and a Tavily-backed web search route (`POST /api/search`) that a participant can make central to their product for the Best Use of Tavily bonus prize. Keys never reach the browser: the Hono server holds them server-side and the client only calls `/api/*`.

## What it is

- Front end: Vite + React (`src/`), built to `dist/` for production.
- Back end: Hono on Node (`server/index.ts`), served with `@hono/node-server`. It holds the service keys, proxies `/api/chat` to Nebius Token Factory and `/api/search` to Tavily, and serves the built SPA plus a JSON `/api/health` route.
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

The hackathon requires a permanent Demo URL that stays up and testable through the end of judging (2026-12-15), separate from any temporary preview. Whichever host you pick, set `NEBIUS_API_KEY` and `TAVILY_API_KEY` as environment variables on that host so the deployed Demo keeps making real Token Factory (and Tavily) calls; never commit them to the repo.

As shipped, `pnpm start` runs a persistent Node.js process (`@hono/node-server`) that serves the built SPA and the API routes together. That shape fits a host that runs a long-lived Node process directly.

- **Railway**: create a project from this repo, set the build command to `pnpm build` and the start command to `pnpm start`, then add `NEBIUS_API_KEY` and `TAVILY_API_KEY` as service variables. Railway runs `pnpm start` as a persistent process, which matches this starter's shape directly.
- **Render**: create a Web Service from this repo with build command `pnpm build` and start command `pnpm start`, then add `NEBIUS_API_KEY` and `TAVILY_API_KEY` in the service's Environment tab. Same persistent-process shape as Railway.
- **Vercel**: Vercel deploys serverless/edge functions, not a long-lived listening process, so `server/index.ts` as shipped (built on `@hono/node-server`, which binds to a port) does not deploy to Vercel unmodified. To deploy here, adapt the Hono app to a Vercel Function using Hono's official Vercel adapter (an `api/` entry exporting the app's handler) and let Vercel serve the built `dist/` output as static assets. Set `NEBIUS_API_KEY` and `TAVILY_API_KEY` as Vercel Environment Variables either way.
- **Cloudflare**: Cloudflare Pages Functions run on the Workers runtime, not Node's `http` server, so the same adaptation problem applies: `server/index.ts`'s Node-specific static-file serving does not run on Workers, although the Hono app object itself already exposes a portable `fetch` handler that Workers can call directly for the two API routes. To deploy here, serve `dist/` via Cloudflare Pages' built-in static hosting and add a Pages Function (for example `functions/api/[[route]].ts`) that wraps the Hono app's `fetch` for `/api/*`, reading the two keys from Cloudflare Pages environment variables/secrets instead of `process.env`.

Given the two adaptations flagged above, Railway or Render is the faster path to a compliant Demo from this starter as shipped.

## License

MIT. See `LICENSE`. The hackathon requires the license to be detectable and visible at the top of the repository page (in the About section) on GitHub, GitLab, or Bitbucket. GitHub auto-detects a standard `LICENSE` file at the repo root, so keeping this file in place and public is enough; if it does not show up, confirm the "License" line under the repo's About panel points at it.
