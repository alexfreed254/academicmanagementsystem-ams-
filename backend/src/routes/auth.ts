/**
 * Authentication routes - login, logout, profile management
 * Handles dual auth: Staff (Supabase JWT) + Students (password hash)
 */

import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { authenticateStaff, authenticateStudent, ROLE_HOME_PATHS, writeAuditLog, hashPassword, loadUserProfile } from '../lib/auth';
import { authMiddleware, getCurrentUser } from '../middleware/auth';
import { rateLimiter } from '../middleware/rate-limiter';
import type { Env } from '../index';

const auth = new Hono<{ Bindings: Env }>();

/**
 * POST /api/auth/login
 * Unified login endpoint
 */
auth.post('/login', rateLimiter({ limit: 5, window: 60 }), async (c) => {
  const env = c.env as Env;
  const body = await c.req.json();
  const { email, password, admission_no, user_type } = body;

  let result;

  if (user_type === 'staff' && email && password) {
    result = await authenticateStaff(env, email, password);
  } else if (user_type === 'student' && admission_no && password) {
    result = await authenticateStudent(env, admission_no, password);
  } else {
    return c.json({ ok: false, error: 'Invalid credentials' }, 400);
  }

  if (!result.success) {
    return c.json({ ok: false, error: result.error }, 401);
  }

  // Set cookies for session management
  const cookieOptions = {
    httpOnly: true,
    secure: env.ENVIRONMENT === 'production',
    sameSite: 'Lax' as const,
    maxAge: 86400, // 24 hours
    path: '/',
  };

  if (result.access_token) {
    setCookie(c, 'sb_access_token', result.access_token, cookieOptions);
    setCookie(c, 'sb_refresh_token', result.refresh_token!, cookieOptions);
  }

  if (result.session_token) {
    setCookie(c, 'session_token', result.session_token, cookieOptions);
  }

  return c.json({
    ok: true,
    user: result.user,
    home_path: ROLE_HOME_PATHS[result.user.role] || '/',
  });
});

/**
 * POST /api/auth/logout
 */
auth.post('/logout', authMiddleware, async (c) => {
  const user = getCurrentUser(c);

  // Audit log
  await writeAuditLog(c.env as Env, {
    actor_id: user.id,
    actor_role: user.role,
    action: 'logout',
    target: 'auth',
  });

  // Clear cookies
  deleteCookie(c, 'sb_access_token');
  deleteCookie(c, 'sb_refresh_token');
  deleteCookie(c, 'session_token');

  return c.json({ ok: true, message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
auth.get('/me', authMiddleware, (c) => {
  const user = getCurrentUser(c);
  return c.json({ ok: true, user, home_path: ROLE_HOME_PATHS[user.role] || '/' });
});

export default auth;
