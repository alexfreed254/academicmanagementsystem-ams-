# TTTI AMS API — Cloudflare Worker

Hono + TypeScript backend that replaces the Flask `/api/v1` JSON API.

```
Pages (React)  --Bearer JWT-->  this Worker  -->  Supabase
```

## Quick start

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in Supabase keys + SESSION_SECRET
npm run check
npx wrangler dev                 # http://127.0.0.1:8787
```

## Layout

```
src/
  index.ts              # Hono app, CORS, health
  types.ts              # Env, SessionUser, roles
  schemas.ts            # Zod validators
  middleware/auth.ts    # requireAuth / requireRole / deptIsolationCheck
  lib/                  # supabase, session JWT, passwords, audit, dates, transcript
  routes/               # auth, notifications, trainer, student
```

## Deploy

See the root [`DEPLOYMENT.md`](../DEPLOYMENT.md). Secrets go through
`wrangler secret put` — never commit `.dev.vars`.
