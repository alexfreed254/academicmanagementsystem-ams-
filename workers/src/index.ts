/**
 * TTTI Academic Management System — Cloudflare Workers API.
 *
 * Hono + TypeScript replacement for the Flask /api/v1 JSON API.
 *
 *   Users → Cloudflare (DNS/CDN/WAF/DDoS) → Pages (React SPA)
 *         → this Worker (auth, RBAC, business logic)
 *         → Supabase (PostgreSQL + Auth + Storage + RLS)
 *
 * Auth model: stateless signed session JWT sent as `Authorization: Bearer`.
 * All DB access uses the service-role key (secret) — RBAC and department
 * isolation are enforced in middleware/route code, mirroring the Flask app.
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import authRoutes from './routes/auth'
import notificationRoutes from './routes/notifications'
import trainerRoutes from './routes/trainer'
import studentRoutes from './routes/student'
import { err } from './lib/responses'
import type { Env, AppVariables } from './types'

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>()

app.use('*', secureHeaders())

// CORS — allow-list from the ALLOWED_ORIGINS var (Pages URL + custom domain).
app.use('*', async (c, next) => {
  const allowed = (c.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  const handler = cors({
    origin: (origin) => (origin && allowed.includes(origin) ? origin : undefined),
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-CSRFToken', 'X-CSRF-Token'],
    exposeHeaders: ['Content-Type'],
    credentials: true,
    maxAge: 86400,
  })
  return handler(c, next)
})

app.get('/api/health', (c) =>
  c.json({ ok: true, service: 'ttti-ams-api', environment: c.env.ENVIRONMENT ?? 'production' }),
)

const api = new Hono<{ Bindings: Env; Variables: AppVariables }>()
api.route('/', authRoutes)
api.route('/', notificationRoutes)
api.route('/', trainerRoutes)
api.route('/', studentRoutes)
app.route('/api/v1', api)

app.notFound((c) => err(c, 'Not found.', 404, 'not_found'))

app.onError((e, c) => {
  console.error(`[ttti-ams-api] Unhandled error on ${c.req.method} ${c.req.path}:`, e)
  return err(c, 'Internal server error.', 500, 'server_error')
})

export default app
