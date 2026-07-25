# TTTI AMS — React + Vite Frontend

Production frontend for the Thika Technical Academic Management System.

## Stack

- React 18 + Vite
- React Router (lazy route-level code splitting)
- TanStack Query
- Axios (**Bearer** session JWT — `withCredentials: false`)
- Tailwind CSS 4
- Framer Motion (selective)
- Chart.js
- Socket.IO client (opt-in via `VITE_SOCKET_URL`)

## Architecture

```
React + Vite (frontend/)
  → React Router (lazy portals)
  → TanStack Query
  → Axios (`src/lib/apiClient.ts`)  same-origin /api/v1/*
  → Cloudflare Worker (Hono)        root wrangler.jsonc
  → Supabase Auth + PostgreSQL + Storage
```

Production is **one Worker** that serves this SPA from `frontend/dist` and the
API from `workers/src`. Leave `VITE_API_BASE_URL` empty. Optional
`VITE_LEGACY_ORIGIN` points PDF/biometric exports at a Flask host only.

Do **not** deploy `frontend/wrangler.jsonc` — it is retired (static-only leftover).

## Local development

1. Worker API + SPA assets (repo root):

```bash
cp workers/.dev.vars.example workers/.dev.vars
npm run dev          # wrangler dev — http://127.0.0.1:8787
```

2. Or Vite-only with API proxy (this folder):

```bash
npm install
npm run dev          # proxies /api → http://127.0.0.1:8787 (see vite.config.ts)
```

## Build

```bash
npm run build        # output: ./dist  (root wrangler assets.directory)
```

## Env

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Leave empty for same-origin Worker `/api` |
| `VITE_LEGACY_ORIGIN` | Optional Flask origin for PDF / biometric links |
| `VITE_SOCKET_URL` | Optional realtime (off by default) |
