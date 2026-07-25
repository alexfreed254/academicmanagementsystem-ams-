import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

/** Success envelope — matches Flask api_v1._ok: {ok: true, data: ...} */
export function ok(c: Context, data?: unknown, extra?: Record<string, unknown>) {
  const payload: Record<string, unknown> = { ok: true }
  if (data !== undefined && data !== null) payload.data = data
  if (extra) Object.assign(payload, extra)
  return c.json(payload)
}

/** Error envelope — matches Flask api_v1._err: {ok: false, error, code?} */
export function err(c: Context, message: string, status: ContentfulStatusCode = 400, code?: string) {
  const body: Record<string, unknown> = { ok: false, error: message }
  if (code) body.code = code
  return c.json(body, status)
}
