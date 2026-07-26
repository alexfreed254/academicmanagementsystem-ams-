/**
 * Legacy Containers entry (Flask Durable Object).
 * Used only with: npx wrangler deploy -c wrangler.containers.toml
 * Default root deploy uses workers/src/index.ts (Hono API).
 */
import { Container, getContainer } from '@cloudflare/containers'

export interface Env {
  FLASK_CONTAINER: DurableObjectNamespace<FlaskContainer>
  SECRET_KEY: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  BIOMETRIC_DEVICE_SECRET?: string
  SPA_ORIGINS?: string
  ALLOW_STUDENT_SELF_REGISTER?: string
  PRIVATE_STORAGE?: string
  FLASK_ENV?: string
  SETUP_PROFILE_TOKEN?: string
}

export class FlaskContainer extends Container<Env> {
  defaultPort = 8080
  sleepAfter = '15m'
  enableInternet = true

  constructor(ctx: DurableObjectState<{}>, env: Env) {
    super(ctx, env)
    this.envVars = {
      PORT: '8080',
      FLASK_ENV: env.FLASK_ENV || 'production',
      SECRET_KEY: env.SECRET_KEY || '',
      SUPABASE_URL: env.SUPABASE_URL || '',
      SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY || '',
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY || '',
      BIOMETRIC_DEVICE_SECRET: env.BIOMETRIC_DEVICE_SECRET || '',
      SPA_ORIGINS: env.SPA_ORIGINS || '',
      SPA_CROSS_SITE: 'false',
      SESSION_COOKIE_SECURE: 'true',
      ALLOW_STUDENT_SELF_REGISTER: env.ALLOW_STUDENT_SELF_REGISTER || 'false',
      PRIVATE_STORAGE: env.PRIVATE_STORAGE || '',
      SETUP_PROFILE_TOKEN: env.SETUP_PROFILE_TOKEN || '',
    }
  }
}

function forwardToFlask(request: Request, env: Env): Promise<Response> {
  const stub = getContainer(env.FLASK_CONTAINER, 'ttti-flask')
  return stub.fetch(request)
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': url.origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers':
            'Content-Type, Authorization, X-CSRFToken, X-CSRF-Token',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      })
    }
    try {
      const res = await forwardToFlask(request, env)
      const headers = new Headers(res.headers)
      if (!headers.has('Access-Control-Allow-Origin')) {
        headers.set('Access-Control-Allow-Origin', url.origin)
        headers.set('Access-Control-Allow-Credentials', 'true')
      }
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers,
      })
    } catch (err) {
      console.error('[worker] Flask container proxy failed', err)
      return new Response(
        '<!DOCTYPE html><html><body><h1>Service starting</h1>' +
          '<p>Container cold-start. Refresh shortly.</p></body></html>',
        {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '5' },
        },
      )
    }
  },
}
