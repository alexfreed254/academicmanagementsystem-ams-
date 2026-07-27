/**
 * Authentication middleware for Hono
 * Handles session validation and role-based access control
 */

import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyJWT, loadUserProfile, STAFF_ROLES, ROLE_HOME_PATHS } from '../lib/auth';
import type { Env } from '../index';

export interface AuthenticatedContext extends Context {
  user?: any;
  accessToken?: string;
}

/**
 * Middleware to check if user is authenticated
 */
export async function authMiddleware(c: Context, next: Next) {
  const env = c.env as Env;
  
  // Try to get access token from cookie or Authorization header
  let accessToken = getCookie(c, 'sb_access_token');
  
  if (!accessToken) {
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }
  }

  if (!accessToken) {
    return c.json({ ok: false, error: 'Not authenticated', code: 'unauthorized' }, 401);
  }

  // Verify token
  const payload = await verifyJWT(accessToken, env.JWT_SECRET);
  if (!payload) {
    return c.json({ ok: false, error: 'Invalid or expired token', code: 'unauthorized' }, 401);
  }

  // Load user profile
  const user = await loadUserProfile(env, payload.userId || payload.sub);
  if (!user || !user.is_active) {
    return c.json({ ok: false, error: 'User not found or inactive', code: 'unauthorized' }, 401);
  }

  // Check must_change_password
  if (user.must_change_password) {
    return c.json({
      ok: false,
      error: 'Password change required',
      code: 'password_change_required',
      redirect: '/auth/change-password',
    }, 403);
  }

  // Attach user to context
  c.set('user', user);
  c.set('accessToken', accessToken);

  await next();
}

/**
 * Middleware factory for role-based access control
 */
export function roleRequired(...allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    await authMiddleware(c, async () => {
      const user = c.get('user');
      
      if (!user || !allowedRoles.includes(user.role)) {
        return c.json({
          ok: false,
          error: 'Forbidden - insufficient permissions',
          code: 'forbidden',
          required_roles: allowedRoles,
        }, 403);
      }

      await next();
    });
  };
}

/**
 * Department isolation check
 */
export function departmentCheck(c: Context, departmentId: string): boolean {
  const user = c.get('user');
  
  // Super admin bypasses department checks
  if (user.role === 'super_admin') {
    return true;
  }

  // Check if user belongs to the department
  return user.department_id === departmentId;
}

/**
 * Extract user from context
 */
export function getCurrentUser(c: Context): any {
  return c.get('user');
}

/**
 * Get home path for user role
 */
export function getHomePath(role: string): string {
  return ROLE_HOME_PATHS[role] || '/';
}
