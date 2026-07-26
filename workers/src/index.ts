/**
 * Cloudflare Worker entry.
 *
 * - /api/*  → Hono API (run_worker_first in wrangler.toml)
 * - /*      → React SPA from Worker Assets (frontend/dist)
 *
 * Open http://127.0.0.1:8787 or your workers.dev URL to see the login UI.
 * Do not open only /api — that is JSON.
 */
import app from './app'

export default app
