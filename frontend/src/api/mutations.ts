import { api } from '@/lib/apiClient'

export async function postAction(path: string, body?: Record<string, unknown>) {
  const url = path.startsWith('/api/') ? path : `/api/v1${path}`
  const { data } = await api.post(url, body || {})
  return data
}

export async function patchAction(path: string, body?: Record<string, unknown>) {
  const url = path.startsWith('/api/') ? path : `/api/v1${path}`
  const { data } = await api.patch(url, body || {})
  return data
}

export async function deleteAction(path: string) {
  const url = path.startsWith('/api/') ? path : `/api/v1${path}`
  const { data } = await api.delete(url)
  return data
}

export async function fetchMeta(resource: 'departments' | 'courses' | 'classes' | 'units' | 'roles', qs = '') {
  const { data } = await api.get(`/api/v1/meta/${resource}${qs ? `?${qs}` : ''}`)
  return (data.data?.items || []) as Array<Record<string, unknown>>
}
