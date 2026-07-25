import type { Context } from 'hono'
import { getServiceClient } from './supabase'
import type { Env, AppVariables } from '../types'

type AppContext = Context<{ Bindings: Env; Variables: AppVariables }>

/**
 * Write to system_logs without blocking the response (Flask used a daemon
 * thread for the same purpose). Never throws.
 */
export function writeAuditLog(
  c: AppContext,
  action: string,
  target?: string,
  opts?: { actorId?: string; actorRole?: string; detail?: Record<string, unknown> },
) {
  const user = c.get('user') as AppVariables['user'] | undefined
  const row = {
    actor_id: opts?.actorId ?? user?.id ?? null,
    actor_role: opts?.actorRole ?? user?.role ?? null,
    action,
    target: target ?? null,
    detail: opts?.detail ?? null,
    ip_address: c.req.header('CF-Connecting-IP') ?? null,
  }
  const task = getServiceClient(c.env)
    .from('system_logs')
    .insert(row)
    .then(
      () => undefined,
      () => undefined,
    )
  try {
    c.executionCtx.waitUntil(task as Promise<void>)
  } catch {
    // executionCtx unavailable (e.g. tests) — fire and forget
    void task
  }
}
