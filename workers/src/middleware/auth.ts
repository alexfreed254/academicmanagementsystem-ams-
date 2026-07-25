import { createMiddleware } from 'hono/factory'
import { extractBearer, verifySessionToken } from '../lib/session'
import { err } from '../lib/responses'
import type { Env, AppVariables } from '../types'

type AppEnv = { Bindings: Env; Variables: AppVariables }

/** Paths still reachable while a password change is pending (mirrors Flask). */
const PASSWORD_CHANGE_ALLOWED = new Set([
  '/api/v1/auth/logout',
  '/api/v1/auth/me',
  '/api/v1/csrf-token',
])

/**
 * requireAuth — mirrors Flask api_login_required:
 * 401 for missing/invalid/expired tokens or inactive users,
 * 403 must_change_password gate everywhere except logout/me.
 */
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

/**
 * requireRole — mirrors Flask api_role_required. Server-side authorization:
 * never rely on frontend role checks alone.
 */
export function requireRole(...roles: string[]) {
  const allowed = new Set(roles)
  return createMiddleware<AppEnv>(async (c, next) => {
    const token = extractBearer(c.req.header('Authorization'))
    if (!token) return err(c, 'Not authenticated.', 401, 'unauthorized')

    const user = await verifySessionToken(c.env, token)
    if (!user) return err(c, 'Not authenticated.', 401, 'unauthorized')

    if (!allowed.has(user.role)) return err(c, 'Forbidden for this role.', 403, 'forbidden')

    if (user.must_change_password && !PASSWORD_CHANGE_ALLOWED.has(new URL(c.req.url).pathname)) {
      return err(c, 'Password change required.', 403, 'must_change_password')
    }

    c.set('user', user)
    await next()
  })
}

/**
 * Department isolation (mirrors auth_utils.dept_isolation_check):
 * super_admin may access any department; everyone else only their own.
 */
export function deptIsolationCheck(user: AppVariables['user'], departmentId: string | null): boolean {
  if (!user) return false
  if (user.role === 'super_admin') return true
  return user.department_id === departmentId
}
