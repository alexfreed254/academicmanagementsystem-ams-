# TTTI AMS — React Frontend

React 18 + Vite + TypeScript SPA. Visual language and portal screens are ported from the Flask Jinja `templates/` folder into `src/pages/`.

## Architecture

```
Browser (this SPA on Cloudflare Pages)
  → Authorization: Bearer <session JWT>
Cloudflare Worker (workers/)  /api/v1/*
  → Supabase (Postgres + Auth + Storage + RLS)
```

Legacy Flask remains optional (`VITE_LEGACY_ORIGIN`) for biometric device UI and any remaining ReportLab/Excel downloads.

## Template → React mapping

| Jinja (`templates/`) | React (`src/pages/`) |
|---|---|
| `main/` | `main/` — landing, about, apply, contact |
| `auth/` | `auth/` — login, forgot/change password, student register |
| `super_admin/` | `super_admin/` + `shared/AdminMenuPages.tsx` |
| `dept_admin/` | `dept_admin/` + shared admin/role menus |
| `trainer/` | `trainer/` + `StudentTrainerMenuPages.tsx` |
| `student/` | `student/` + detail/upload pages |
| `clearance/` | `shared/ClearanceDetailPages.tsx` + shared modules |
| `examination_officer/`, `industry_mentor/`, `internal_verifier/`, `liaison_officer/`, `cdacc_verifier/`, `workshop_technician/`, `service_dept/`, `admin_oversight/` | Matching role dashboard folders + `shared/RoleMenuPages.tsx` |
| PDF print HTML | `shared/PrintReportPages.tsx` (browser print) |
| `notifications/`, profile | `shared/NotificationsPage.tsx`, `ProfilePage.tsx` |

Portal chrome (sidebar/topbar) lives in `layouts/PortalShell.tsx` with CSS from `styles/portal-*.css` (ported from Jinja/`static/css`).

## Local development

```bash
# Terminal 1 — API Worker
cd ../workers
cp .dev.vars.example .dev.vars   # fill Supabase + SESSION_SECRET
npm ci && npx wrangler dev       # http://127.0.0.1:8787

# Terminal 2 — SPA
npm ci
npm run dev                      # http://localhost:5173  (/api → Worker)
```

Optional: hit Flask instead of the Worker with `VITE_DEV_PROXY=http://127.0.0.1:5000`.

## Environment

See `.env.example`:

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Worker URL in production; empty in local Vite (proxy) |
| `VITE_LEGACY_ORIGIN` | Optional Flask origin for biometric / binary PDF / Excel |

## Build / deploy

```bash
npm run build    # → dist/
```

Cloudflare Pages: see root `DEPLOYMENT.md` and `.github/workflows/deploy-pages.yml`.
