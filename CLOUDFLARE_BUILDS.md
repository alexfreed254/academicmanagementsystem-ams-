# Cloudflare Workers Builds — required settings

The Worker serves **both** the React UI and the Hono API:

```text
/*        → React SPA (frontend/dist)
/api/*    → Hono API
```

## Why the last deploy failed (missing `hono`, etc.)

Cloudflare runs `bun install` at the **repo root**. Worker libraries (`hono`, `@supabase/supabase-js`, `zod`, `scrypt-js`) must be listed in the **root** `package.json`, not only under `workers/`.

`npm run deploy` now installs those deps, builds the SPA, then runs `wrangler deploy`.

## Fix in Cloudflare Dashboard

**Workers & Pages** → your project → **Settings** → **Build**

| Setting | Value |
|---|---|
| **Deploy command** | `npm run deploy` |
| **Root directory** | `/` (repo root) |
| **Build system** | default / Node |

Do **not** use plain `npx wrangler deploy`.

Optional (cleaner CI): if the dashboard has separate fields:

| Setting | Value |
|---|---|
| Build command | `npm run build:frontend` |
| Deploy command | `npx wrangler deploy` |

## Runtime secrets (required for login)

**Settings → Variables and Secrets** (Runtime, not Build):

- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET` (long random string)

`SUPABASE_URL` and `ALLOWED_ORIGINS` are in `wrangler.toml` (update `ALLOWED_ORIGINS` to include your `*.workers.dev` URL after first deploy).

## Note about Python / pip in the log

Root `requirements.txt` is for the **legacy Flask** app (kept as fallback). Cloudflare may still run `pip install` — that is unused for the Worker deploy and can be ignored. The Worker deploy path is Node + Wrangler only.

## After changing the Deploy command

Save settings → **Retry deployment** (or push a new commit).  
Open the `*.workers.dev` URL — you should see the **login UI**, not JSON.
