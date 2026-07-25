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
# CRITICAL — Runtime secrets (Settings → Variables and Secrets):
#   Add these as type "Secret" under the Worker RUNTIME bindings.
#   Do NOT put them only under "Build variables and secrets" — those are
#   invisible to the running Worker and login will 500 after auth.
#
#   Exact names (must match):
#     SUPABASE_ANON_KEY
#     SUPABASE_SERVICE_ROLE_KEY
#     SESSION_SECRET          (long random string; can reuse Flask SECRET_KEY)
#
# After saving runtime secrets, trigger a NEW deployment (or open a page that
# forces a new Worker version). Then check:
#   GET https://<your-worker>.workers.dev/api/health
#   → "ready": true and all secrets.* true
#
# Non-secret vars are already in wrangler.jsonc (SUPABASE_URL, ALLOWED_ORIGINS).
#
# Local:
#   Copy workers/.dev.vars.example → workers/.dev.vars and fill values.
