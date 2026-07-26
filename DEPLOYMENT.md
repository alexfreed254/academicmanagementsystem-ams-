# Cloudflare Deployment Guide — TTTI Academic Management System

This guide takes the inventoried Flask + React system to the target architecture:

```
Users
  ↓
Cloudflare (DNS · SSL/TLS · CDN · WAF · DDoS)
  ↓
Cloudflare Pages  — React + Vite + TypeScript (frontend/)
  ↓ HTTPS  Authorization: Bearer <session JWT>
Cloudflare Workers — Hono + TypeScript API (workers/)
  ↓ service-role key (secret)
Supabase — PostgreSQL + Auth + Storage + RLS
```

Read `MIGRATION_INVENTORY.md` first — it lists every Flask route, table, auth flow,
and the blockers that keep PDFs / biometrics / Jinja portals on a legacy origin for now.

---

## 0. Prerequisites

- Cloudflare account (Workers Paid plan recommended for higher subrequest limits)
- Supabase project already provisioned with `supabase_schema.sql` + all `*_migration.sql`
- GitHub repo: `https://github.com/alexfreed254/academic-management-system-254`
- Node.js 20+
- Cloudflare Wrangler CLI (`npm i -g wrangler` optional — CI uses it via the action)

---

## 1. Cloudflare account setup

1. Sign in at https://dash.cloudflare.com
2. Note your **Account ID** (Overview → Account ID) — needed for CI secrets.
3. Create an API token:
   - My Profile → API Tokens → Create Token
   - Use the **Edit Cloudflare Workers** template, and also enable:
     - Account → Cloudflare Pages → Edit
     - Zone → Zone Settings / DNS / Zone → Read/Edit (for the custom domain zone)
   - Save the token somewhere safe — it is shown once.

---

## 2. Supabase configuration

No schema rewrite is required. Confirm:

1. SQL Editor has applied `supabase_schema.sql` and every `*_migration.sql`.
2. Storage buckets exist: `assessment-scripts`, `assessment-evidence`,
   `application-documents`, `trip-media`, `mentoring-tools`.
3. Auth → Providers → Email enabled.
4. Project Settings → API → copy:
   - Project URL → `SUPABASE_URL`
   - `anon` `public` key → `SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY` (**never** put this in the frontend)

RLS policies stay as defence-in-depth. The Worker uses the service-role key and
enforces RBAC + department isolation in TypeScript (same model as Flask).

---

## 3. Cloudflare Workers setup (API)

**Git-connected Builds** deploy the **repo root** `wrangler.toml`, which points at
`workers/src/index.ts` (Hono). No Docker / Containers in that path.

Standalone Workers project (`workers/wrangler.toml`, name `ttti-ams-api`) remains
available via GitHub Action `deploy-workers.yml` or `cd workers && npx wrangler deploy`.

```bash
cd workers
npm install
cp .dev.vars.example .dev.vars
# Edit .dev.vars with real Supabase keys + a long SESSION_SECRET
# Generate: openssl rand -hex 32   (or  python -c "import secrets;print(secrets.token_hex(32))")
```

Local run:

```bash
npm run check          # TypeScript
npx wrangler dev       # http://127.0.0.1:8787
curl http://127.0.0.1:8787/api/health
```

Production secrets (never in `wrangler.toml`):

```bash
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put SESSION_SECRET
```

Non-secret vars — edit `workers/wrangler.toml`:

```toml
[vars]
SUPABASE_URL = "https://YOUR_PROJECT.supabase.co"
ALLOWED_ORIGINS = "https://ttti-ams.pages.dev,https://ams.yourdomain.ac.ke"
ENVIRONMENT = "production"
```

Deploy:

```bash
npx wrangler deploy
# → https://ttti-ams-api.<account>.workers.dev
```

Optional custom API domain (after DNS is on Cloudflare):

```toml
routes = [
  { pattern = "api.yourdomain.ac.ke", custom_domain = true }
]
```

Then redeploy. SSL is automatic (Full / Full strict).

---

## 4. Cloudflare Pages setup (Frontend)

### Option A — GitHub automatic (recommended)

1. Dash → Workers & Pages → Create → Pages → Connect to Git
2. Select `ACADEMIC-MANAGEMENT-SYSTEM254`
3. Build settings:
   - Framework preset: Vite
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Environment variables (Production):
   - `VITE_API_BASE_URL` = `https://ttti-ams-api.<account>.workers.dev`  
     (or `https://api.yourdomain.ac.ke`)
   - `VITE_LEGACY_ORIGIN` = URL of the still-running Flask service (PDFs, biometrics, Jinja)
5. Save and Deploy.

SPA routing is covered by `frontend/public/_redirects` (`/* /index.html 200`).

### Option B — GitHub Actions (also included)

`.github/workflows/deploy-pages.yml` builds and runs
`wrangler pages deploy frontend/dist --project-name=ttti-ams`.

Create the Pages project once (`wrangler pages project create ttti-ams`) if it does
not already exist, then rely on the workflow.

---

## 5. Environment variables & secrets matrix

| Name | Where | Secret? | Purpose |
|---|---|---|---|
| `SUPABASE_URL` | Worker vars | no | Project URL |
| `SUPABASE_ANON_KEY` | Worker secret | yes | Staff GoTrue login |
| `SUPABASE_SERVICE_ROLE_KEY` | Worker secret | yes | Server DB / Storage (bypasses RLS) |
| `SESSION_SECRET` | Worker secret | yes | Signs session JWTs (HS256) |
| `ALLOWED_ORIGINS` | Worker vars | no | CORS allow-list (comma-separated) |
| `ENVIRONMENT` | Worker vars | no | Label in `/api/health` |
| `VITE_API_BASE_URL` | Pages env / GH var | no | Absolute API origin baked into the SPA |
| `VITE_LEGACY_ORIGIN` | Pages env / GH var | no | Flask origin for PDF / biometric links |
| `CLOUDFLARE_API_TOKEN` | GitHub secret | yes | CI deploys |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub secret | yes | CI deploys |

Frontend must **never** receive the service-role key.

---

## 6. Custom domain, DNS, SSL

1. Add the institute domain to Cloudflare (Add a Site) and switch nameservers.
2. Pages → Custom domains → `ams.yourdomain.ac.ke` (CNAME to `ttti-ams.pages.dev`).
3. Workers → Triggers → Custom Domains → `api.yourdomain.ac.ke`.
4. SSL/TLS → Overview → set mode to **Full (strict)**.
5. Always Use HTTPS = On. Automatic HTTPS Rewrites = On.
6. Update Worker `ALLOWED_ORIGINS` to include `https://ams.yourdomain.ac.ke` and redeploy.
7. Rebuild Pages so `VITE_API_BASE_URL=https://api.yourdomain.ac.ke`.

DNS records Cloudflare will create automatically for Pages/Workers custom domains;
do not point the apex/API at Render or any non-Cloudflare origin if you want the
CDN/WAF/DDoS stack in front.

---

## 7. CORS

The Worker CORS middleware only reflects origins listed in `ALLOWED_ORIGINS`.
Include every browser origin that will call the API:

```
ALLOWED_ORIGINS=http://localhost:5173,https://ttti-ams.pages.dev,https://ams.yourdomain.ac.ke
```

The SPA sends `Authorization: Bearer <token>` and does **not** rely on cookies,
so cross-subdomain auth works without `SameSite=None` cookie gymnastics.

---

## 8. WAF, DDoS, Security (Cloudflare edge)

On the zone that hosts `ams.` / `api.`:

1. **Security → Settings**
   - Security Level: Medium (or High during incidents)
   - Bot Fight Mode: On (Free) / Super Bot Fight Mode (Paid)
2. **Security → WAF**
   - Managed ruleset: Cloudflare Managed Ruleset → Enable
   - OWASP Core Ruleset → Enable (tune false positives for file-upload paths later)
3. **Security → DDoS**
   - HTTP DDoS Managed Ruleset → default (always on for proxied hostnames)
4. **Security → WAF → Rate limiting rules** (Paid) — examples:
   - `api.yourdomain.ac.ke/api/v1/auth/login` → 8 requests / minute / IP (matches Flask)
   - `/api/v1/*` mutating methods → 120 requests / minute / IP
5. **Scrape Shield / Hotlink Protection** as needed for static assets.
6. Never expose `SUPABASE_SERVICE_ROLE_KEY` or `SESSION_SECRET` in Pages env vars.

---

## 9. GitHub automatic deployments

Repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | token from §1 |
| `CLOUDFLARE_ACCOUNT_ID` | account id from §1 |

Repository variables:

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://api.yourdomain.ac.ke` |
| `VITE_LEGACY_ORIGIN` | Flask/legacy URL (optional) |

Workflows:

- `.github/workflows/deploy-workers.yml` — deploys `workers/` on push to `main`
- `.github/workflows/deploy-pages.yml` — builds `frontend/` and publishes to Pages

A push that only touches docs will not redeploy either; path filters keep deploys
scoped. Use **workflow_dispatch** for a manual redeploy.

---

## 10. Production deployment checklist

1. Apply all SQL migrations in Supabase.
2. Put Worker secrets (`wrangler secret put …`).
3. Set `ALLOWED_ORIGINS` + `SUPABASE_URL` in `wrangler.toml` and `wrangler deploy`.
4. Confirm `curl https://api…/api/health` → `{ok:true,…}`.
5. Set Pages env vars; deploy frontend.
6. Log in as a trainer and a student; exercise dashboard / attendance / marks.
7. Attach custom domains; flip SSL to Full (strict).
8. Enable WAF managed rules + login rate limit.
9. Keep Flask online only for PDF / biometric / remaining Jinja portals, behind
   `VITE_LEGACY_ORIGIN`, until those modules are ported.

---

## 11. Local development

Terminal 1 — API:

```bash
cd workers
cp .dev.vars.example .dev.vars   # fill secrets
npm install
npx wrangler dev                 # :8787
```

Terminal 2 — SPA:

```bash
cd frontend
cp .env.example .env             # leave VITE_API_BASE_URL empty to use Vite proxy
npm install
npm run dev                      # :5173 → proxies /api to :8787
```

To point the SPA at legacy Flask instead: `VITE_DEV_PROXY=http://127.0.0.1:5000`.

---

## 12. Rollback procedures

### Workers

```bash
npx wrangler deployments list
npx wrangler rollback
# or pin a specific deployment id:
npx wrangler rollback <deployment-id>
```

### Pages

Dash → Workers & Pages → `ttti-ams` → Deployments → … → **Rollback to this deployment**.

### Git

```bash
git revert <bad-commit>
git push origin main          # CI redeploys the previous good build
```

### Secrets

If a secret is leaked: rotate in Supabase (new service-role key),
`wrangler secret put …` again, and invalidate sessions by rotating `SESSION_SECRET`
(forces every user to log in again).

---

## 13. Monitoring and logs

- **Workers live logs:** `cd workers && npx wrangler tail`
- **Dash → Workers → ttti-ams-api → Logs / Metrics** (CPU time, errors, requests)
- **Observability** is enabled in `wrangler.toml` (`[observability] enabled = true`)
- **Pages → Analytics** for SPA traffic
- **Security → Events** for WAF / Bot / DDoS actions
- Application audit trail remains in Supabase table `system_logs` (Worker writes
  via `ctx.waitUntil` on login/logout and mutating trainer actions)

Alerting tip: create a Cloudflare notification policy for Worker error-rate spikes
and for Security Events above a threshold.

---

## 14. Auth & RBAC reminder (server-side only)

| Actor | Login | Token |
|---|---|---|
| Staff (19 roles) | email + Supabase Auth | Bearer session JWT (24 h) |
| Student | admission no + Werkzeug hash | Bearer session JWT (24 h) |

Every protected route runs `requireAuth` / `requireRole(...)`. Department isolation
and trainer unit-ownership checks live in the route handlers. The SPA role menus
are UX only — never the security boundary.

Supported roles: `super_admin`, `dept_admin`, `trainer`, `student`,
`examination_officer`, `industry_mentor`, `internal_verifier`, `liaison_officer`,
`cdacc_verifier`, `workshop_technician`, `registrar`, `deputy_principal`,
`quality_assurance_officer`, `library_hod`, `sports_hod`, `service_clearance_officer`,
`environment_hod`, `dean_students`, `finance_officer`, `employer`.

---

## 15. What is still on the legacy Flask origin (phase 2)

Per the inventory, these stay on Render/Flask until ported:

- ~210 Jinja HTML portals for roles beyond trainer/student SPA screens
- All ReportLab / openpyxl PDF & Excel exports
- Biometric device API + in-memory live sessions
- File uploads (POE, documents, trip media, mentoring tools)
- Clearance certificate PDF + public verify page

Point `VITE_LEGACY_ORIGIN` at that service so SPA "Open in portal" / PDF links keep working.

---

## 16. Quick reference commands

```bash
# Workers
cd workers && npm run check && npx wrangler deploy && npx wrangler tail

# Pages (manual)
cd frontend && npm run build
npx wrangler pages deploy dist --project-name=ttti-ams

# Secrets
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put SUPABASE_ANON_KEY
```
