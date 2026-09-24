#!/usr/bin/env node
// Starts the Hono API (server/index.ts via tsx, port 3000) and the Vite dev
// server (port 5173, --host 0.0.0.0) together for the Agent Launcher's Tenki
// Preview (see AGENTS.md, and the orchestrator contract's
// PREVIEW_ACTIVITY_FILE / previewStartCommand). PREVIEW_MODE defaults to
// "poll" when unset (the 2026-09-24 HMR spike found the preview proxy does
// not reliably pass Vite's HMR websocket); the launcher can set
// PREVIEW_MODE=hmr instead. This script is a plain Node child-process runner,
// not a new dependency, so that killing it also kills both children (needed
// by the preview-control skill and the watchdog).

import { spawn } from "node:child_process";

process.env.PREVIEW_MODE = process.env.PREVIEW_MODE || "poll";

/** @type {import("node:child_process").ChildProcess[]} */
const children = [];
let shuttingDown = false;

function run(cmd, args) {
  const child = spawn(cmd, args, { stdio: "inherit", env: process.env });
  children.push(child);
  child.on("exit", (code) => shutdown(code ?? 0));
  return child;
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill("SIGTERM");
  }
  process.exitCode = code;
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

run("pnpm", ["exec", "tsx", "server/index.ts"]);
run("pnpm", ["exec", "vite", "--host", "0.0.0.0"]);
