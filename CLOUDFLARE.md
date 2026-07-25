# Cloudflare Workers Builds — monorepo cheat sheet
#
# One Worker serves BOTH the React SPA and the Hono API:
#   - /api/* → workers/src (Hono)
#   - everything else → frontend/dist (Vite SPA)
#
# Dashboard settings for project "academic-management-system254":
#
#   Root directory:     (blank — repo root)
#   Build command:      (optional) npm run build
#   Deploy command:     npx wrangler deploy
#
# Required secrets (Workers → Settings → Variables and Secrets):
#   SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY
#   SESSION_SECRET          (long random string; can reuse Flask SECRET_KEY)
#
# Non-secret vars are already in wrangler.jsonc (SUPABASE_URL, ALLOWED_ORIGINS).
#
# After setting secrets, trigger a new deployment from latest main.
# Do NOT click "Retry" on an old failed build — start a fresh deploy.
#
# Local:
#   cd workers && npm ci && npx wrangler secret put SESSION_SECRET
#   (or put secrets in workers/.dev.vars — see workers/.dev.vars.example)
