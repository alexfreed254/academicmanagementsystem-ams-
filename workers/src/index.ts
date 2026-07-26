/**
 * Cloudflare Worker entry.
 *
 * - /api/*  → Hono API (run_worker_first in wrangler.toml)
 * - /*      → React SPA from Worker Assets (frontend/dist)
 *
 * Open the workers.dev URL in a browser to see the website.
 * API-only JSON is at /api/health and /api/v1/*.
 */
import app from './app'

export default app
