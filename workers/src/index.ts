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
import adminRoutes from './routes/admin'
import roleRoutes from './routes/roles'
import sharedRoutes from './routes/shared'
import mutationRoutes from './routes/mutations'
import publicRoutes from './routes/public'
import printRoutes from './routes/print'
import { err } from './lib/responses'
import { ConfigError, envStatus } from './lib/env'
import type { Env, AppVariables } from './types'

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>()

app.use('*', secureHeaders())

// CORS — allow-list from ALLOWED_ORIGINS, plus same-origin (SPA + API on one Worker).
app.use('*', async (c, next) => {
  const allowed = (c.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  let selfOrigin = ''
  try {
    selfOrigin = new URL(c.req.url).origin
  } catch {
    /* ignore */
  }
  const handler = cors({
    origin: (origin) => {
      if (!origin) return origin
      if (allowed.includes(origin)) return origin
      if (selfOrigin && origin === selfOrigin) return origin
      return undefined
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-CSRFToken', 'X-CSRF-Token'],
    exposeHeaders: ['Content-Type'],
    credentials: false,
    maxAge: 86400,
  })
  return handler(c, next)
})

app.get('/api/health', (c) => {
  const secrets = envStatus(c.env)
  const ready = Object.values(secrets).every(Boolean)
  return c.json({
    ok: true,
    service: 'ttti-ams-api',
    environment: c.env.ENVIRONMENT ?? 'production',
    ready,
    secrets,
  })
})

const api = new Hono<{ Bindings: Env; Variables: AppVariables }>()
api.route('/', authRoutes)
api.route('/', notificationRoutes)
api.route('/', trainerRoutes)
api.route('/', studentRoutes)
api.route('/', adminRoutes)
api.route('/', roleRoutes)
api.route('/', sharedRoutes)
api.route('/', mutationRoutes)
api.route('/', publicRoutes)
api.route('/', printRoutes)
app.route('/api/v1', api)

app.notFound((c) => err(c, 'Not found.', 404, 'not_found'))

app.onError((e, c) => {
  console.error(`[ttti-ams-api] Unhandled error on ${c.req.method} ${c.req.path}:`, e)
  if (e instanceof ConfigError) {
    return err(c, e.message, 500, 'misconfigured')
  }
  const message = e instanceof Error ? e.message : 'Internal server error.'
  // Surface actionable config/crypto errors to the client so dashboard mis-sets are visible.
  if (
    /supabaseKey|SESSION_SECRET|secret|Missing|required|sign|JWT|crypto/i.test(message)
  ) {
    return err(c, message, 500, 'server_error')
  }
  return err(c, 'Internal server error.', 500, 'server_error')
})

export default app
