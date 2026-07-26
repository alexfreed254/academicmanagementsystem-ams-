import axios, { AxiosError, type AxiosInstance } from 'axios'

/**
 * Pages → Workers architecture (default):
 *   Authorization: Bearer <session JWT>  (no cookies / CSRF)
 *
 * Set VITE_AUTH_MODE=cookie only when talking to legacy Flask session APIs.
 */
const baseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || ''

/** `bearer` (default) | `cookie` (legacy Flask CSRF session) */
const authMode = ((import.meta.env.VITE_AUTH_MODE as string | undefined) || 'bearer').toLowerCase()
const useCookieAuth = authMode === 'cookie'

export const TOKEN_KEY = 'ttti_access_token'

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: useCookieAuth,
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
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (!useCookieAuth) return config

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

/** Absolute URL for leftover Flask-only surfaces (PDF/Excel/biometric). */
export function legacyHref(path: string): string | null {
  const base = (import.meta.env.VITE_LEGACY_ORIGIN as string | undefined)?.replace(/\/$/, '') || ''
  if (!base) return null
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export function hasLegacyOrigin(): boolean {
  return Boolean((import.meta.env.VITE_LEGACY_ORIGIN as string | undefined)?.trim())
}
