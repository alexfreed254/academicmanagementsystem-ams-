import type { Hono } from 'hono'
import { err } from '../lib/responses'
import { ConfigError } from '../lib/env'
import type { Env, AppVariables } from '../types'

type AppEnv = { Bindings: Env; Variables: AppVariables }

/** Global Hono onError handler — keeps index/app thin. */
export function registerErrorHandler(app: Hono<AppEnv>) {
  app.onError((e, c) => {
    console.error(`[ttti-ams-api] Unhandled error on ${c.req.method} ${c.req.path}:`, e)
    if (e instanceof ConfigError) {
      return err(c, e.message, 500, 'misconfigured')
    }
    const message = e instanceof Error ? e.message : 'Internal server error.'
    if (/supabaseKey|SESSION_SECRET|secret|Missing|required|sign|JWT|crypto/i.test(message)) {
      return err(c, message, 500, 'server_error')
    }
    return err(c, 'Internal server error.', 500, 'server_error')
  })
}
