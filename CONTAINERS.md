# Cloudflare Workers + Containers (Flask) — TTTI AMS

Deploy **both** the React SPA and the unmodified Flask API in **one** Cloudflare
project: Worker Assets (React) + Cloudflare Containers (Flask/gunicorn), with a
single Worker routing traffic.

```
Users
  ↓
Cloudflare Worker  (src/index.ts)
  ├─ /api/* , /biometric/* , /static/*  →  Flask Container (Dockerfile → gunicorn :8080)
  └─ /*                                 →  React SPA (frontend/dist)
  ↓
Supabase (PostgreSQL + Auth + Storage + RLS)
```

Flask app code is **not rewritten** — it runs as-is inside the container.

---

## 1. Prerequisites

- Docker Desktop (or Docker Engine) **running locally**
- Node.js 20+
- Cloudflare account with **Workers Paid** (Containers require a paid plan)
- Wrangler 4+: `npm i` at repo root installs it
- Supabase project already provisioned

---

## 2. Project files (this setup)

| Path | Role |
|---|---|
| `Dockerfile` | Production Flask image (gunicorn on `0.0.0.0:8080`) |
| `.dockerignore` | Keeps image small |
| `wrangler.toml` | Assets + `[[containers]]` + Durable Object binding |
| `src/index.ts` | Router Worker + `FlaskContainer` DO class |
| `frontend/` | React + Vite → build to `frontend/dist` |
| `package.json` | Root scripts: `build:frontend`, `dev`, `deploy` |

The older `workers/` Hono API remains in the repo as an alternate path; **this**
Containers layout is the one described by `wrangler.toml` at the repo root.

---

## 3. Exact CLI commands (in order)

### A. Install tooling

```bash
cd "C:\Users\user\Desktop\ACADEMIC MANAGEMENT SYSTEM"
npm install
```

### B. Build the React SPA

```bash
npm run build:frontend
```

Confirm `frontend/dist/index.html` exists.

### C. Configure secrets (once per environment)

```bash
npx wrangler login

npx wrangler secret put SECRET_KEY
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# optional:
npx wrangler secret put BIOMETRIC_DEVICE_SECRET
npx wrangler secret put SETUP_PROFILE_TOKEN
```

Edit `wrangler.toml` `[vars].SPA_ORIGINS` to your final Worker/custom domain
(comma-separated if you have more than one), e.g.:

```toml
SPA_ORIGINS = "https://ttti-ams.<ACCOUNT_SUBDOMAIN>.workers.dev"
```

### D. Local build & test (Docker required)

```bash
# Optional: smoke-test the image alone
docker build -t ttti-flask:local .
docker run --rm -p 8080:8080 ^
  -e SECRET_KEY=dev-secret ^
  -e FLASK_ENV=production ^
  -e SUPABASE_URL=https://YOUR_PROJECT.supabase.co ^
  -e SUPABASE_ANON_KEY=... ^
  -e SUPABASE_SERVICE_ROLE_KEY=... ^
  ttti-flask:local
# Then: curl http://127.0.0.1:8080/api/v1/csrf-token

# Full Worker + container locally (Wrangler builds/pushes image as needed)
npm run build:frontend
npx wrangler dev
```

Open the URL Wrangler prints (usually `http://127.0.0.1:8787`).

- SPA: `/`
- API: `/api/v1/csrf-token`
- First `/api` hit may be slow (container cold start)

### E. Deploy

```bash
npm run build:frontend
npx wrangler deploy
```

Wrangler will build the Docker image, push it to Cloudflare’s registry, apply
the Durable Object migration, and publish the Worker.

### F. Verify the container is live

```bash
npx wrangler containers list
npx wrangler tail
curl -sS "https://<your-worker>.workers.dev/api/v1/csrf-token"
```

Also hit `https://<your-worker>.workers.dev/` and confirm the React login page loads.

### G. Custom domain (optional)

1. Add the domain in Cloudflare DNS  
2. Uncomment / set `routes` in `wrangler.toml`  
3. Update `SPA_ORIGINS` to that hostname  
4. `npx wrangler deploy` again  

---

## 4. CORS / cookies

Same Worker hostname for SPA + `/api` ⇒ **same-origin**.

- Frontend uses `withCredentials: true` and Flask CSRF (`X-CSRFToken`)
- Leave `VITE_API_BASE_URL` **empty** in the Pages/Assets build
- Flask `SPA_ORIGINS` is injected from Worker secrets/vars into the container

Cross-origin is only needed if you later split hosts; then set `SPA_ORIGINS` and
build the SPA with `VITE_API_BASE_URL=https://api-host`.

---

## 5. Cloudflare Containers limitations (Flask-specific)

| Topic | What to expect |
|---|---|
| **Cold starts** | After `sleepAfter` (15m idle here), the next request boots a new VM. Expect multi-second latency; clients should retry on `503 container_unavailable`. |
| **Max instances** | Set by `max_instances` in `wrangler.toml` (here `3`). Concurrent load beyond that queues/rejects. |
| **Instance size** | `instance_type` (`lite` / `basic` / `standard`). ReportLab + openpyxl + Pillow need enough RAM — **`basic` recommended**; raise if PDF/Excel OOMs. |
| **Ephemeral disk** | Container filesystem is **not** durable. Do not write lasting files locally — use **Supabase Storage** (already the case). |
| **Persistent connections** | Long-lived WebSockets / SSE through the container are a poor fit; this app does not require a Socket.IO server. |
| **Background jobs** | `threading.Thread` for audit logs works **only while the process is up**. No Celery/cron — use Cron Triggers / Queues outside the container if you add scheduled work. Biometric **in-memory** sessions die when the container sleeps — keep scanners active or redesign with Durable Object / DB sessions. |
| **Secrets / env** | Put secrets with `wrangler secret put`; `FlaskContainer` copies them into `envVars` for gunicorn. Never bake `.env` into the image. |
| **Gunicorn workers** | Dockerfile uses 2 workers × 4 threads. In-memory Flask-Limiter and biometric `_sessions` are **per process** — not shared across workers/instances. |
| **Request size** | Flask caps body at 25 MB; Cloudflare and container proxies may have lower practical limits — test large POE uploads. |
| **Outbound network** | `enableInternet = true` so Flask can reach Supabase. Without it, Auth/DB/Storage calls fail. |
| **Billing** | Containers bill for active instance time; tune `sleepAfter` vs cold-start UX. |

---

## 6. Rollback

```bash
npx wrangler deployments list
npx wrangler rollback
```

Render/Flask remains untouched until you point DNS at the Worker.

---

## 7. Related docs

- `MIGRATION_INVENTORY.md` — full Flask surface & blockers  
- `DEPLOYMENT.md` — earlier Pages + Hono Workers path (optional alternative)  
- [Cloudflare Containers get started](https://developers.cloudflare.com/containers/get-started/)
