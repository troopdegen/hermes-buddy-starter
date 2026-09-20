# Hermes Buddy Starter

A hackathon starter you fork, extend, and submit the same day. Vite + React on the front, a small Hono server on the back. It ships wired to the Nebius x NVIDIA stack so your entry is compliant out of the box: inference runs on Nebius Token Factory with an NVIDIA Nemotron model, and web search runs on Tavily.

The keys never touch the browser. The Hono server holds them and proxies the two key-bearing calls, so you can build a real product without leaking a credential into a client bundle.

## What you need

Four keys. Three are service keys the app uses; the fourth (Tenki) is only relevant if you run this inside a Tenki sandbox via the launcher.

- `NEBIUS_API_KEY`: Nebius Token Factory (inference).
- `TELEGRAM_BOT_TOKEN`: only if you also run the Hermes agent alongside the starter (the launcher provisions it); the starter itself does not use it.
- `TAVILY_API_KEY`: Tavily (web search).
- Tenki key: stays in the launcher, never here.

Copy `.env.example` to `.env` and fill in `NEBIUS_API_KEY` and `TAVILY_API_KEY`. The file holds placeholders only; never commit real keys.

## Run it

```bash
pnpm install
pnpm build      # builds the SPA into dist/
pnpm start      # Hono serves the SPA + API on http://localhost:3000
```

For a fast edit loop, `pnpm dev` runs Vite on :5173 and proxies `/api` to the Hono server on :3000 (start the server in a second terminal with `pnpm start`).

## Endpoints

The server serves the built SPA from `dist/` and exposes three JSON endpoints.

- `GET /api/health`: reports the configured model and whether each key is present. Never returns a key value.
- `POST /api/chat`: proxies an OpenAI-shaped chat completion to Nebius Token Factory (`{NEBIUS_BASE_URL}/v1/chat/completions`, default model `nvidia/nemotron-3-super-120b-a12b`). Body: `{ "messages": [{ "role": "user", "content": "..." }] }`. Optional: `model`, `temperature`, `max_tokens`.
- `POST /api/search`: proxies a Tavily search. Body: `{ "query": "..." }`. Optional: `maxResults`, `searchDepth` (`basic` or `advanced`). Missing or empty `query` returns 400.

## Compliance

Nebius x NVIDIA requires inference on Nebius Token Factory plus at least one NVIDIA open model. This starter defaults to `nvidia/nemotron-3-super-120b-a12b` on `https://api.tokenfactory.nebius.com`, so a submission built on it qualifies without extra wiring. Confirm the exact Nemotron model id available to your account against `GET https://api.tokenfactory.nebius.com/v1/models` and override with `NEBIUS_MODEL` if needed.

## License

MIT. See `LICENSE`.
