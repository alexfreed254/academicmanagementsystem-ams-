/**
 * Hono application for TTTI AMS API.
 * Route modules under ./routes reuse existing Flask-ported business logic.
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
import { registerErrorHandler } from './middleware/error-handler'
import type { Env, AppVariables } from './types'

export type AppEnv = { Bindings: Env; Variables: AppVariables }

const app = new Hono<AppEnv>()

app.use('*', secureHeaders())

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

app.get('/', (c) =>
  c.json({
    ok: true,
    service: 'ttti-ams-api',
    message: 'Hono API Worker — UI is on Cloudflare Pages (ttti-ams).',
    health: '/api/health',
    api_base: '/api/v1',
    examples: {
      health: 'GET /api/health',
      login: 'POST /api/v1/auth/login',
      me: 'GET /api/v1/auth/me',
    },
  }),
)

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

const api = new Hono<AppEnv>()
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

app.notFound((c) =>
  err(
    c,
    `Not found: ${c.req.method} ${new URL(c.req.url).pathname}. Try GET / or GET /api/health.`,
    404,
    'not_found',
  ),
)
registerErrorHandler(app)

export { ConfigError }
export default app
