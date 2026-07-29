/** Flask / Jinja app origin (Render). SPA redirects login here. */
export function getLegacyOrigin(): string {
  const fromEnv = (import.meta.env.VITE_LEGACY_ORIGIN as string | undefined)?.replace(/\/$/, '')
  if (fromEnv) return fromEnv

  const api = (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''
  // Origin only; strip accidental /api/v1 if present
  if (api) {
    return api.replace(/\/$/, '').replace(/\/api\/v1$/i, '')
  }
  return ''
}

/** Canonical login page — Jinja template at /auth/login */
export function getLoginUrl(): string {
  const origin = getLegacyOrigin()
  return origin ? `${origin}/auth/login` : '/auth/login'
}

export function redirectToLogin(): void {
  window.location.replace(getLoginUrl())
}
