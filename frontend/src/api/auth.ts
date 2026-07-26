import { api, setAccessToken } from '@/lib/apiClient'
import type { AuthUser } from '@/types'

type LoginResponse = {
  ok: boolean
  data: {
    user: AuthUser
    token?: string
  }
}

export async function loginStaff(email: string, password: string) {
  const { data } = await api.post<LoginResponse>('/api/v1/auth/login', {
    login_type: 'staff',
    email,
    password,
  })
  if (data.data.token) setAccessToken(data.data.token)
  return data.data.user
}

export async function loginStudent(admission_no: string, password: string) {
  const { data } = await api.post<LoginResponse>('/api/v1/auth/login', {
    login_type: 'student',
    admission_no,
    password,
  })
  if (data.data.token) setAccessToken(data.data.token)
  return data.data.user
}

export async function fetchMe() {
  const { data } = await api.get('/api/v1/auth/me')
  return data.data.user as AuthUser
}

export async function logout() {
  try {
    await api.post('/api/v1/auth/logout')
  } finally {
    setAccessToken(null)
  }
}
