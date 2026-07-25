import { sign, verify } from 'hono/jwt'
import type { Env, SessionUser } from '../types'

const SESSION_TTL_SECONDS = 60 * 60 * 24 // 1 day, matches Flask PERMANENT_SESSION_LIFETIME

/** Issue a stateless session token holding the safe profile subset. */
export async function issueSessionToken(env: Env, user: SessionUser): Promise<string> {
  const secret = env.SESSION_SECRET?.trim()
  if (!secret) {
    throw new Error('SESSION_SECRET is missing. Set it as a Runtime secret in Cloudflare.')
  }
  const now = Math.floor(Date.now() / 1000)
  try {
    return await sign(
      {
        sub: user.id,
        user,
        iat: now,
        exp: now + SESSION_TTL_SECONDS,
        iss: 'ttti-ams',
      },
      secret,
      'HS256',
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`Failed to sign session token: ${msg}`)
  }
}

/** Verify a Bearer token; returns the embedded user or null. */
export async function verifySessionToken(env: Env, token: string): Promise<SessionUser | null> {
  try {
    const payload = await verify(token, env.SESSION_SECRET, 'HS256')
    const user = payload?.user as SessionUser | undefined
    if (!user || !user.id || !user.is_active) return null
    return user
  } catch {
    return null
  }
}

export function extractBearer(authorization: string | undefined): string | null {
  if (!authorization) return null
  const m = authorization.match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : null
}
