/**
 * TTTI AMS — Cloudflare Worker (edge proxy)
 *
 * SOURCE OF TRUTH remains Flask:
 *   - Design / UI  → templates/
 *   - Functionality → routes/
 *
 * This Worker forwards ALL HTTP traffic to FLASK_ORIGIN (Render or any
 * gunicorn host). Cloudflare Containers are disabled until the account can
 * push images (Workers Paid). Dockerfile stays in the repo for that upgrade.
 */
export interface Env {
  /** Base URL of the live Flask app, e.g. https://your-app.onrender.com (no trailing slash) */
  FLASK_ORIGIN: string
  SPA_ORIGINS?: string
  FLASK_ENV?: string
}

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'cf-connecting-ip',
  'cf-ray',
  'cf-visitor',
  'cf-ipcountry',
  'x-forwarded-proto',
  'x-real-ip',
])

function filterRequestHeaders(src: Headers): Headers {
  const out = new Headers()
  src.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) out.set(key, value)
  })
  return out
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const origin = (env.FLASK_ORIGIN || '').replace(/\/$/, '')
    if (!origin) {
      return new Response(
        [
          '<!DOCTYPE html><html><body style="font-family:system-ui;padding:2rem">',
          '<h1>FLASK_ORIGIN not set</h1>',
          '<p>In Cloudflare Dashboard → Workers →',
          ' <code>academic-management-system-254</code> → Settings → Variables,</p>',
          '<p>add <strong>FLASK_ORIGIN</strong> =',
          ' your Render URL (e.g. <code>https://thika-technical-training-institute-ams.onrender.com</code>).</p>',
          '<p>Containers stay off until Workers Paid can push images',
          ' (current CI error: <code>Unauthorized</code> on container registry).</p>',
          '</body></html>',
        ].join(''),
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      )
    }

    const incoming = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': incoming.origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers':
            'Content-Type, Authorization, X-CSRFToken, X-CSRF-Token',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    const target = new URL(incoming.pathname + incoming.search, origin)
    const headers = filterRequestHeaders(request.headers)
    headers.set('X-Forwarded-Host', incoming.host)
    headers.set('X-Forwarded-Proto', incoming.protocol.replace(':', ''))

    try {
      const upstream = await fetch(target.toString(), {
        method: request.method,
        headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
        redirect: 'manual',
      })

      const outHeaders = new Headers(upstream.headers)
      if (!outHeaders.has('Access-Control-Allow-Origin')) {
        outHeaders.set('Access-Control-Allow-Origin', incoming.origin)
        outHeaders.set('Access-Control-Allow-Credentials', 'true')
      }

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: outHeaders,
      })
    } catch (err) {
      console.error('[worker] upstream Flask fetch failed', err)
      return new Response(
        '<!DOCTYPE html><html><body><h1>Upstream unavailable</h1>' +
          `<p>Could not reach Flask at <code>${origin}</code>. Check Render is up and FLASK_ORIGIN is correct.</p></body></html>`,
        {
          status: 502,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        },
      )
    }
  },
}
