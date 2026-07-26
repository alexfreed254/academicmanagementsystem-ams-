import { Hono } from 'hono'
import { getServiceClient } from '../lib/supabase'
import { ok, err } from '../lib/responses'
import { requireAuth } from '../middleware/auth'
import type { Env, AppVariables } from '../types'

const notifications = new Hono<{ Bindings: Env; Variables: AppVariables }>()

notifications.get('/notifications', requireAuth, async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const unreadOnly = c.req.query('unread_only') === '1' || c.req.query('unread_only') === 'true'
  const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10) || 50, 100)

  let q = db
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (unreadOnly) q = q.eq('is_read', false)

  const [{ data: items }, { count }] = await Promise.all([
    q,
    db
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
  ])

  return ok(c, { notifications: items ?? [], unread_count: count ?? 0 })
})

notifications.get('/notifications/recent', requireAuth, async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const limit = Math.min(parseInt(c.req.query('limit') ?? '10', 10) || 10, 30)

  const [{ data: items }, { count }] = await Promise.all([
    db
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit),
    db
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
  ])

  return ok(c, { notifications: items ?? [], unread_count: count ?? 0 })
})

notifications.get('/notifications/count', requireAuth, async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { count } = await db
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
  return ok(c, { count: count ?? 0 })
})

notifications.post('/notifications/mark-all-read', requireAuth, async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { error } = await db
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
  if (error) return err(c, error.message, 400)
  return ok(c, { marked: true })
})

notifications.post('/notifications/:id/read', requireAuth, async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const { error } = await db
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return err(c, error.message, 400)
  return ok(c, { marked: true })
})

notifications.post('/notifications/:id/delete', requireAuth, async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const { error } = await db.from('notifications').delete().eq('id', id).eq('user_id', user.id)
  if (error) return err(c, error.message, 400)
  return ok(c, { deleted: true })
})

export default notifications
