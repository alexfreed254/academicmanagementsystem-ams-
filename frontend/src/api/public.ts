import { api } from '@/lib/apiClient'

export type DepartmentOption = {
  id: string
  name: string
  code?: string | null
}

type DepartmentsResponse = {
  ok: boolean
  data: { departments: DepartmentOption[] }
}

type ApplyResponse = {
  ok: boolean
  data: { submitted: boolean; message: string }
}

export async function fetchDepartments() {
  const { data } = await api.get<DepartmentsResponse>('/api/v1/public/departments')
  return data.data.departments
}

export async function submitApplication(form: FormData) {
  const { data } = await api.post<ApplyResponse>('/api/v1/public/apply', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}
