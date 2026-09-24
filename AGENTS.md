# AGENTS: nebius-nvidia-ai-hackathon-starter

Context for any coding agent (Codex, Claude Code, Cursor, or a human) working in this repo. This is the Nebius x NVIDIA hackathon starter: a participant forks or copies it and builds their submission on top.

## Stack

Front end: Vite + React 18, TypeScript, in `src/`. Back end: Hono on Node, served with `@hono/node-server`, in `server/index.ts`. Package manager: pnpm (see `packageManager` in `package.json`; do not use npm or yarn, the lockfile is pnpm's).

## File map

- `src/App.tsx`: the whole UI (chat panel, search panel). Add new UI here or split into new components under `src/`.
- `src/main.tsx`, `src/styles.css`: React entry point and styles.
- `server/index.ts`: the Hono app. Add new API routes here, under `/api/*`. Keys stay server-side; never read a service key in `src/`.
- `vite.config.ts`: dev server config, the `/api` proxy to the Hono server, and the Preview-mode plugins used only by `pnpm dev:preview` (see below).
- `scripts/dev-preview.mjs`: runs the API and Vite dev servers together for the sandboxed Preview; not needed for normal local development.
- `.env.example`: placeholders only. Copy to `.env` for local secrets; `.env` is gitignored.
- `dist/`: build output, gitignored, do not edit by hand.

## Commands

- `pnpm install`: install dependencies.
- `pnpm dev`: Vite on `:5173`, proxying `/api` to `:3000`. Run `pnpm start` in a second terminal for the API.
- `pnpm build`: builds the SPA to `dist/`.
- `pnpm start`: runs the built app, Hono serving the SPA and API together on `:3000`.
- `pnpm dev:preview`: starts the API and Vite dev server together in one process, for the Agent Launcher's Tenki sandbox Preview only. It sets `PREVIEW_MODE` (defaults to `poll`; the launcher may set `hmr`), binds Vite to `0.0.0.0`, and allows the Tenki preview host. Do not use this for normal local development, use `pnpm dev` instead.
- `pnpm typecheck`: `tsc --noEmit` over `src/`, `server/`, and `vite.config.ts`.

## Where to add things

- New pages or components: `src/`, imported from `App.tsx` or a router you add.
- New API routes: `server/index.ts`, as additional Hono routes under `/api/*`. Keep the pattern of validating the request body before spending a call to an upstream API.
- New service keys: add to `.env.example` as a placeholder, read from `process.env` only inside `server/index.ts`, and document the key in `README.md`.

## Rules

- Keep the build green: `pnpm typecheck` and `pnpm build` must pass before you consider a change done.
- Never commit a real secret. Only `.env.example` is tracked, with placeholder values; `.env` is gitignored.
- Keys never reach the browser. The client only calls `/api/*`; the Hono server is the only code that reads `NEBIUS_API_KEY` or `TAVILY_API_KEY`.
- Read `README.md` for the hackathon compliance requirement (a runtime call to Nebius Token Factory using an NVIDIA open model) before changing `server/index.ts`'s `/api/chat` route.
