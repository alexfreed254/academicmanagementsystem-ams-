# TTTI AMS — React + Vite Frontend

Production frontend for the Thika Technical Academic Management System.

## Stack

- React 18 + Vite
- React Router (lazy route-level code splitting)
- TanStack Query
- Axios (Bearer JWT to Cloudflare Workers; optional cookie mode for legacy Flask)
- Tailwind CSS 4
- Framer Motion (selective)
- Chart.js / Recharts
- Socket.IO client (opt-in via `VITE_SOCKET_URL`)
- React Player (available for media screens)

## Architecture

```
React + Vite
  → React Router (lazy portals)
  → TanStack Query
  → Axios (`src/lib/apiClient.ts`)  Authorization: Bearer <session JWT>
  → Cloudflare Workers Hono `/api/v1/*`
  → Supabase Auth + PostgreSQL + Storage

Legacy Jinja portals (unchanged) still served by Flask on Render when needed
(PDF / Excel / biometric / not-yet-ported screens).
```

Design is preserved. Only the API destination changes for SPA-wired screens.

## Local development

1. Start the Hono Worker (`workers/`):

```bash
cd workers
npm install
cp .dev.vars.example .dev.vars   # fill Supabase keys + SESSION_SECRET
npx wrangler dev                 # http://127.0.0.1:8787
```

2. Start Vite (this folder):

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` → Worker `:8787` by default.

To hit legacy Flask instead:

```bash
# PowerShell
$env:VITE_DEV_PROXY="http://127.0.0.1:5000"; npm run dev
```

(and set `VITE_AUTH_MODE=cookie` in `frontend/.env`).

## Environment

Copy `.env.example` to `.env`:

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Empty in local (Vite proxy). Production: Worker URL |
| `VITE_AUTH_MODE` | `bearer` (Workers, default) or `cookie` (legacy Flask) |
| `VITE_LEGACY_ORIGIN` | Flask origin for PDF/Excel/biometric leftovers |
| `VITE_SOCKET_URL` | Optional Socket.IO server |

## Production build

```bash
npm run build
```

Deploy `dist/` to Cloudflare Pages. Set `VITE_API_BASE_URL` to the Worker origin and `VITE_AUTH_MODE=bearer`.

## Migration status

| Area | Status |
|---|---|
| Auth login (staff + trainee) | Done → Workers Bearer JWT |
| Trainer core (dashboard, attendance, assessments, marks-entry) | Done → Workers |
| Student core (dashboard, attendance, units, marks) | Done → Workers |
| Other trainer/student screens | Placeholder → legacy Flask |
| Other portals | Jinja / Flask until ported |

Jinja routes are **not** removed. Do not delete templates until each screen is ported and verified.
