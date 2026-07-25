# TTTI AMS API — Cloudflare Worker (Hono)

Hono + TypeScript backend for `/api/v1/*`. In production this source is bundled
by the **repo-root** `wrangler.jsonc` together with the React SPA — not as a
standalone `ttti-ams-api` Worker.

```
Browser  --same origin-->  Cloudflare Worker
  /api/*  → this Hono app (Bearer JWT)  →  Supabase
  /*      → frontend/dist SPA
```

## Quick start

Prefer the monorepo root:

```bash
# repo root
cp workers/.dev.vars.example workers/.dev.vars
npm run check
npm run dev              # wrangler.dev from root wrangler.jsonc
npm run deploy
```

API-only local (optional):

```bash
cd workers
npm install
cp .dev.vars.example .dev.vars
npm run check
npx wrangler dev --config ../wrangler.jsonc   # use root config
```

`workers/wrangler.toml` is **retired** (split-topology leftover). Do not deploy it.

## Layout

```
src/
  index.ts              # Hono app, CORS, health
  types.ts              # Env, SessionUser, roles
  schemas.ts            # Zod validators
  middleware/auth.ts    # requireAuth / requireRole
  lib/                  # supabase, session JWT, passwords, audit, dates, transcript
  routes/               # auth, notifications, trainer, student, admin, roles, shared
```

## Runtime secrets

Set on the unified Worker (dashboard or `wrangler secret put` from repo root):

- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`
