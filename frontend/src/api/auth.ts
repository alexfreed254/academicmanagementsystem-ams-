import { api } from '@/lib/apiClient'
import type { AuthUser } from '@/types'

export async function loginStaff(email: string, password: string) {
  const { data } = await api.post('/api/auth/login', {
    user_type: 'staff',
    email,
    password,
  })
  return data.user as AuthUser
}

export async function loginStudent(admission_no: string, password: string) {
  const { data } = await api.post('/api/auth/login', {
    user_type: 'student',
    admission_no,
    password,
  })
  return data.user as AuthUser
}

export async function fetchMe() {
  const { data } = await api.get('/api/auth/me')
  return data.user as AuthUser
}

export async function logout() {
  await api.post('/api/auth/logout')
}
