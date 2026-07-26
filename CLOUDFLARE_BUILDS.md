# Cloudflare Build settings (Workers Git integration)

Your Worker URL should show the **React website**, not API JSON.

## Required dashboard change

**Workers & Pages → academic-management-system-254 → Settings → Builds**

| Setting | Value |
|---|---|
| **Build command** | *(leave empty or)* `npm run build` |
| **Deploy command** | `npm run deploy` |

Do **not** use bare `npx wrangler deploy` — that skips `frontend/dist` and you only get the API.

After the next green deploy, open:

```text
https://academic-management-system-254.<your-subdomain>.workers.dev/
```

You should see the login / landing UI.

| Path | What you get |
|---|---|
| `/` | React website |
| `/login` | Login page |
| `/api/health` | API health JSON |
| `/api/v1/...` | API |

## Secrets (Worker → Settings → Variables)

- `SESSION_SECRET`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_URL` is already in `wrangler.toml` `[vars]`.
