# TTTI AMS API — Cloudflare Worker

Hono + TypeScript backend that ports the Flask `/api/v1` JSON API to Cloudflare Workers.

**Important:** Open the Worker URL in a browser to see the **React login UI**.  
`/api/*` is JSON only — if you only open `/api` or `/api/health` you will see a plain JSON page.

```
Browser  →  /*           →  React SPA (frontend/dist Assets)
         →  /api/v1/*    →  Hono API  →  Supabase
```

## Quick start (UI + API together)

```bash
# from repo root
npm --prefix frontend run build
cd workers
cp .dev.vars.example .dev.vars   # fill secrets
npm install
npx wrangler dev                 # http://127.0.0.1:8787  ← login UI
```

Or from repo root after `npm install`:

```bash
npm run deploy    # production (builds SPA then deploys)
```

## Secrets (never commit)

| Name | Purpose |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Anon key (staff password verify) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — Worker only |
| `SESSION_SECRET` | HS256 signing key for session JWTs |

```bash
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put SESSION_SECRET
```

## Auth model (preserves Flask login rules)

| Actor | Rule |
|---|---|
| Staff | Email + password → Supabase Auth |
| Student | Admission no + Werkzeug `password_hash` |
| Session | Bearer JWT (`data.token`) |

Flask remains for PDF / Excel / biometric until those are ported.
