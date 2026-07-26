/**
 * TTTI AMS — Cloudflare Worker + Flask Container
 *
 * SOURCE OF TRUTH:
 *   - Design / UI  → templates/   (Jinja)
 *   - Functionality → routes/     (Flask blueprints) + app helpers
 *
 * All HTTP traffic is proxied to the unmodified Flask app in the Container.
 * No Worker Assets / frontend/dist required for deploy.
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

/**
 * Durable Object that owns the Flask container lifecycle.
 * class_name must match wrangler.toml [[containers]] / durable_objects binding.
 */
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

  override onStart(): void {
    console.log('[FlaskContainer] started — serving routes/ + templates/')
  }

  override onStop(params: { exitCode: number; reason: string }): void {
    console.log('[FlaskContainer] stopped', params)
  }

  override onError(error: unknown): void {
    console.error('[FlaskContainer] error', error)
    throw error
  }
}

function forwardToFlask(request: Request, env: Env): Promise<Response> {
  const stub = getContainer(env.FLASK_CONTAINER, 'ttti-flask')
  return stub.fetch(request)
}

async function proxyFlask(request: Request, env: Env): Promise<Response> {
  try {
    const res = await forwardToFlask(request, env)
    const url = new URL(request.url)
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
        '<p>The academic system container is cold-starting. Refresh in a few seconds.</p></body></html>',
      {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '5' },
      },
    )
  }
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

    // Entire app: Flask routes/ + templates/ + static/ + /api
    return proxyFlask(request, env)
  },
}
