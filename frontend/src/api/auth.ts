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

export type ProfileRow = {
  id: string
  full_name: string
  email?: string | null
  role: string
  admission_no?: string | null
  staff_no?: string | null
  mobile_number?: string | null
  department_id?: string | null
  is_active?: boolean
  must_change_password?: boolean
  passport_file_path?: string | null
  passport_file_name?: string | null
  departments?: { name?: string } | null
}

export async function fetchProfile() {
  const { data } = await api.get('/api/v1/auth/profile')
  return data.data.profile as ProfileRow
}

export async function updateProfile(payload: { full_name: string; mobile_number: string }) {
  const { data } = await api.patch('/api/v1/auth/profile', payload)
  return data.data.profile as ProfileRow
}

export async function changePassword(current_password: string, new_password: string) {
  await api.post('/api/v1/auth/change-password', { current_password, new_password })
}

type ForgotPasswordPayload =
  | { login_type: 'staff'; email: string }
  | { login_type: 'student'; admission_no?: string }

type ForgotPasswordResponse = {
  ok: boolean
  data: { info?: string; message?: string; sent?: boolean }
}

export async function forgotPassword(payload: ForgotPasswordPayload) {
  const { data } = await api.post<ForgotPasswordResponse>('/api/v1/auth/forgot-password', payload)
  return data.data
}

type StudentRegisterPayload = {
  admission_no: string
  full_name: string
  email: string
  password: string
}

type StudentRegisterResponse = {
  ok: boolean
  data: { registered: boolean; message: string }
}

export async function studentRegister(payload: StudentRegisterPayload) {
  const { data } = await api.post<StudentRegisterResponse>('/api/v1/auth/student/register', payload)
  return data.data
}
