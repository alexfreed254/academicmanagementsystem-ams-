import { Hono } from 'hono'
import { getServiceClient } from '../lib/supabase'
import { ok } from '../lib/responses'
import { requireAuth } from '../middleware/auth'
import type { Env, AppVariables } from '../types'

const notifications = new Hono<{ Bindings: Env; Variables: AppVariables }>()

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

export default notifications
