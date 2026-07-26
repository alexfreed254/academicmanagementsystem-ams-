import axios, { AxiosError, type AxiosInstance } from 'axios'

/**
 * Same-origin by default (Cloudflare Worker Assets + Flask Container).
 * Set VITE_API_BASE_URL only if the API is on a different host.
 */
const baseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || ''

export const TOKEN_KEY = 'ttti_access_token'

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  // Flask /api/v1 uses session cookies + CSRF (unmodified Flask in the container).
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

let csrfToken: string | null = null
let csrfPromise: Promise<string> | null = null

async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken
  if (!csrfPromise) {
    csrfPromise = api
      .get('/api/v1/csrf-token')
      .then((res) => {
        const body = res.data as { data?: { csrf_token?: string }; csrf_token?: string }
        csrfToken = body?.data?.csrf_token || body?.csrf_token || ''
        return csrfToken
      })
      .finally(() => {
        csrfPromise = null
      })
  }
  return csrfPromise
}

api.interceptors.request.use(async (config) => {
  // Optional Bearer (Hono Workers path). Flask ignores unknown Authorization.
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const method = (config.method || 'get').toLowerCase()
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const url = String(config.url || '')
    if (!url.includes('/csrf-token')) {
      try {
        const csrf = await ensureCsrfToken()
        if (csrf) config.headers['X-CSRFToken'] = csrf
      } catch {
        // Flask will reject if CSRF is required and missing
      }
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; code?: string }>) => {
    const status = error.response?.status
    const code = error.response?.data?.code
    if (status === 401 || code === 'unauthorized') {
      sessionStorage.removeItem(TOKEN_KEY)
      const path = window.location.pathname
      if (!path.startsWith('/login')) {
        window.dispatchEvent(new CustomEvent('ttti:session-expired'))
      }
    }
    return Promise.reject(error)
  },
)

export function setAccessToken(token: string | null) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token)
  else sessionStorage.removeItem(TOKEN_KEY)
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined
    if (data?.error) return data.error
    if (error.code === 'ECONNABORTED') return 'Request timed out. Check your connection.'
    if (!error.response) return 'Network error. Check your connection.'
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

/** Absolute URL for leftover Flask-only surfaces when API is not same-origin. */
export function legacyHref(path: string): string | null {
  const base = (import.meta.env.VITE_LEGACY_ORIGIN as string | undefined)?.replace(/\/$/, '') || ''
  if (!base) return null
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export function hasLegacyOrigin(): boolean {
  return Boolean((import.meta.env.VITE_LEGACY_ORIGIN as string | undefined)?.trim())
}
