/**
 * requireAuth — mirrors Flask api_login_required.
 * RBAC helpers live in ./rbac and are re-exported for existing route imports.
 */
import { createMiddleware } from 'hono/factory'
import { extractBearer, verifySessionToken } from '../lib/session'
import { err } from '../lib/responses'
import { PASSWORD_CHANGE_ALLOWED } from './rbac'
import type { Env, AppVariables } from '../types'

type AppEnv = { Bindings: Env; Variables: AppVariables }

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = extractBearer(c.req.header('Authorization'))
  if (!token) return err(c, 'Not authenticated.', 401, 'unauthorized')

  const user = await verifySessionToken(c.env, token)
  if (!user) return err(c, 'Not authenticated.', 401, 'unauthorized')

  if (user.must_change_password && !PASSWORD_CHANGE_ALLOWED.has(new URL(c.req.url).pathname)) {
    return err(c, 'Password change required.', 403, 'must_change_password')
  }

  c.set('user', user)
  await next()
})

export { requireRole, deptIsolationCheck } from './rbac'
