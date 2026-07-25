import axios, { AxiosError, type AxiosInstance } from 'axios'

const baseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || ''

export const TOKEN_KEY = 'ttti_access_token'

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  // Bearer tokens don't need cookies. Keep credentials off so CORS is simpler
  // across Pages (frontend) and Workers (API) on different subdomains.
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
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
