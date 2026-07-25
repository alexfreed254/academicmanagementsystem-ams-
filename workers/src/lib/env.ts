import type { Env } from '../types'

/** Runtime config error — surfaced to the client as a clear 500 message. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

function present(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/** Which required bindings are present (booleans only — never values). */
export function envStatus(env: Env) {
  return {
    SUPABASE_URL: present(env.SUPABASE_URL),
    SUPABASE_ANON_KEY: present(env.SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: present(env.SUPABASE_SERVICE_ROLE_KEY),
    SESSION_SECRET: present(env.SESSION_SECRET),
  }
}

/** Throw a clear ConfigError if any login-critical secret is missing. */
export function assertLoginEnv(env: Env): void {
  const status = envStatus(env)
  const missing = Object.entries(status)
    .filter(([, ok]) => !ok)
    .map(([name]) => name)
  if (missing.length) {
    throw new ConfigError(
      `Worker missing runtime secret(s): ${missing.join(', ')}. ` +
        'Add them under Settings → Variables and Secrets (Runtime), not Build variables, then redeploy.',
    )
  }
}
