# TTTI AMS API — Cloudflare Worker

Hono + TypeScript backend that ports the Flask `/api/v1` JSON API to Cloudflare Workers.

```
Pages (React)  --Bearer JWT-->  this Worker  -->  Supabase Auth / DB / Storage
```

Flask on Render remains available as reference and for legacy HTML / PDF / Excel / biometric until fully verified.

## Quick start

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in Supabase keys + SESSION_SECRET
npm run check
npx wrangler dev                 # http://127.0.0.1:8787
```

From `frontend/`, Vite proxies `/api` → `:8787` by default.

## Layout

See [`STRUCTURE.md`](./STRUCTURE.md).

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

Non-secret vars live in `wrangler.toml` (`SUPABASE_URL`, `ALLOWED_ORIGINS`, `ENVIRONMENT`).

## Auth model (preserves Flask login rules)

| Actor | Rule |
|---|---|
| Staff | Email + password → Supabase Auth `signInWithPassword` |
| Student | Admission no + Werkzeug `password_hash` in `user_profiles` |
| Session | Stateless HS256 JWT (1 day TTL) returned as `data.token`; SPA stores Bearer |

## Phase 2 coverage (SPA-wired first)

Already mounted under `/api/v1`:

- Auth: login / logout / me / csrf-token / profile / change-password / forgot-password / register
- Notifications
- Trainer: dashboard, marks-entry, assessments, attendance (+ extras)
- Student: dashboard, attendance, units, marks (+ extras)
- Additional admin / roles / shared / mutations / public / print modules from the prior port

Still on Flask until later phases: live biometric device callbacks, ReportLab PDFs, openpyxl Excel streams.

## Deploy

```bash
npx wrangler deploy
```

Keep `ALLOWED_ORIGINS` set to your Cloudflare Pages origin(s). Do not use `*` for credentialed or production SPA traffic.
