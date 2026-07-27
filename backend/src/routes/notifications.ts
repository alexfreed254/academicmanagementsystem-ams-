/**
 * Notifications routes
 */

import { Hono } from 'hono';
import { authMiddleware, getCurrentUser } from '../middleware/auth';
import { getUserClient } from '../lib/supabase';
import type { Env } from '../index';

const notifications = new Hono<{ Bindings: Env }>();

notifications.use('*', authMiddleware);

/**
 * GET /api/notifications/recent
 */
notifications.get('/recent', async (c) => {
  const env = c.env as Env;
  const user = getCurrentUser(c);
  const client = getUserClient(env, c.get('accessToken') || '');

  const { data, error } = await client
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return c.json({ ok: false, error: error.message }, 500);
  }

  return c.json({ ok: true, data });
});

/**
 * GET /api/notifications/count
 */
notifications.get('/count', async (c) => {
  const env = c.env as Env;
  const user = getCurrentUser(c);
  const client = getUserClient(env, c.get('accessToken') || '');

  const { count, error } = await client
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    return c.json({ ok: false, error: error.message }, 500);
  }

  return c.json({ ok: true, count });
});

/**
 * POST /api/notifications/:id/mark-read
 */
notifications.post('/:id/mark-read', async (c) => {
  const env = c.env as Env;
  const user = getCurrentUser(c);
  const id = c.req.param('id');
  const client = getUserClient(env, c.get('accessToken') || '');

  const { error } = await client
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return c.json({ ok: false, error: error.message }, 500);
  }

  return c.json({ ok: true });
});

export default notifications;
