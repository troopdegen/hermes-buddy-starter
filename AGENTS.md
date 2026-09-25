# AGENTS: nebius-nvidia-ai-hackathon-starter

Context for any coding agent (Codex, Claude Code, Cursor, or a human) working in this repo. This is the Nebius x NVIDIA hackathon starter: a participant forks or copies it and builds their submission on top.

## Stack

Front end: Vite + React 18, TypeScript, in `src/`. Back end: a runtime-neutral Hono app in `server/app.ts`, with one thin entry point per host: `server/index.ts` (Node), `api/health.ts` / `api/chat.ts` / `api/search.ts` (Vercel), `server/worker.ts` (Cloudflare Workers). Package manager: pnpm; do not use npm or yarn, the lockfile is pnpm's.

## File map

- `src/App.tsx`: the whole UI (chat panel, search panel). Add new UI here or split into new components under `src/`.
- `src/main.tsx`, `src/styles.css`: React entry point and styles.
- `server/app.ts`: the Hono app and all `/api/*` routes. Add new routes here; keys stay server-side, read per request, never in `src/`.
- `server/index.ts`: Node entry (Railway, Render, `pnpm start`, `pnpm dev:preview`); adds static SPA serving on top of `server/app.ts`, no routes here.
- `api/health.ts`, `api/chat.ts`, `api/search.ts`: Vercel Function entries, one per route, each re-exporting `server/app.ts`.
- `server/worker.ts`: Cloudflare Workers entry, re-exporting `server/app.ts`.
- `vercel.json`, `wrangler.jsonc`: per-host build/routing config; see README for deploy commands.
- `vite.config.ts`: dev config, the `/api` proxy, and the Preview-mode plugins used only by `pnpm dev:preview`.
- `scripts/dev-preview.mjs`: runs the API and Vite dev servers together, for the sandboxed Preview only.
- `.env.example`: placeholders only. Copy to `.env` for local secrets; `.env` is gitignored.
- `dist/`: build output, gitignored, do not edit by hand.

## Commands

- `pnpm install`: install dependencies.
- `pnpm dev`: Vite on `:5173`, proxying `/api` to `:3000`. Run `pnpm start` in a second terminal for the API.
- `pnpm build`: builds the SPA to `dist/`.
- `pnpm start`: runs the built app, Hono serving the SPA and API together on `:3000`.
- `pnpm dev:preview`: starts the API and Vite dev server together, for the Agent Launcher's Tenki sandbox Preview only (sets `PREVIEW_MODE`, binds Vite to `0.0.0.0`, allows the Tenki preview host). Use `pnpm dev` for normal local development.
- `pnpm typecheck`: `tsc --noEmit` over `src/`, `server/`, `api/`, and `vite.config.ts`.

## Where to add things

- New pages or components: `src/`, imported from `App.tsx` or a router you add.
- New API routes: `server/app.ts`, as additional Hono routes under `/api/*`; validate the request body before spending a call to an upstream API. Needs no change in `server/index.ts` or `server/worker.ts`; on Vercel it needs one more `api/<name>.ts` re-exporting `server/app.ts`.
- New service keys: add to `.env.example` as a placeholder, read via `server/app.ts`'s `readEnv()` only, and document in `README.md` (including as a Vercel Environment Variable and a `wrangler secret`).

## Rules

- Keep the build green: `pnpm typecheck` and `pnpm build` must pass before you consider a change done.
- Never commit a real secret. Only `.env.example` is tracked, with placeholder values; `.env` is gitignored.
- Keys never reach the browser. The client only calls `/api/*`; only `server/app.ts` reads `NEBIUS_API_KEY` or `TAVILY_API_KEY`.
- Read `README.md` for the hackathon compliance requirement (a runtime call to Nebius Token Factory using an NVIDIA open model) before changing the `/api/chat` route.
- Cloudflare deploys are Workers, never Pages: no `wrangler pages` command anywhere.
