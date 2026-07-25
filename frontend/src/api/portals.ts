import { api } from '@/lib/apiClient'

/** Loose row type — dashboards render joined Supabase rows verbatim. */
export type Row = Record<string, unknown>

export interface SuperAdminDashboardData {
  stats: Record<string, number>
  ia_stats: Record<string, number>
  ca_stats: Record<string, number>
  role_map: Record<string, number>
  trend_labels: string[]
  trend_present: number[]
  trend_absent: number[]
  atype_labels: string[]
  atype_counts: number[]
  dept_chart_labels: string[]
  dept_chart_students: number[]
  dept_chart_trainers: number[]
  dept_chart_classes: number[]
  dept_stats: Array<{
    id: string
    name: string
    class_count: number
    student_count: number
    trainer_count: number
    unit_count: number
  }>
  recent_assessments: Row[]
  recent_clearances: Row[]
  recent_logs: Row[]
}

export async function fetchSuperAdminDashboard() {
  const { data } = await api.get('/api/v1/super-admin/dashboard')
  return data.data as SuperAdminDashboardData
}

export interface DeptAdminDashboardData {
  department_name: string
  dept: Row
  stats: Record<string, number>
  app_status: Record<string, number>
  clearance_stats: Record<string, number>
  attachment_stats: Record<string, number>
  att_unit_labels: string[]
  att_unit_present: number[]
  att_unit_absent: number[]
  trend_labels: string[]
  trend_present: number[]
  trend_absent: number[]
  class_labels: string[]
  class_counts: number[]
  atype_labels: string[]
  atype_counts: number[]
  unread_notifications: Row[]
  recent_assessments: Row[]
  recent_attendance: Row[]
  units_list: Row[]
}

export async function fetchDeptAdminDashboard() {
  const { data } = await api.get('/api/v1/dept-admin/dashboard')
  return data.data as DeptAdminDashboardData
}

export interface ExamOfficerDashboardData {
  total_approved: number
  total_pending: number
  total_completed: number
  recent_bookings: Row[]
}

export async function fetchExamOfficerDashboard() {
  const { data } = await api.get('/api/v1/examination-officer/dashboard')
  return data.data as ExamOfficerDashboardData
}

export interface IndustryMentorDashboardData {
  mentor: Row
  attachments: Row[]
  pending_logbooks: Row[]
  pending_competencies: Row[]
}

export async function fetchIndustryMentorDashboard() {
  const { data } = await api.get('/api/v1/industry-mentor/dashboard')
  return data.data as IndustryMentorDashboardData
}

export interface InternalVerifierDashboardData {
  pending_competencies: Row[]
  total_pending: number
  verified_count: number
  rejected_count: number
}

export async function fetchInternalVerifierDashboard() {
  const { data } = await api.get('/api/v1/internal-verifier/dashboard')
  return data.data as InternalVerifierDashboardData
}

export interface LiaisonDashboardData {
  stats: { total: number; pending: number; active: number; approved: number; companies: number }
  pending_attachments: Row[]
  active_attachments: Row[]
  recent_logbooks: Row[]
  current_month: string
}

export async function fetchLiaisonDashboard() {
  const { data } = await api.get('/api/v1/liaison-officer/dashboard')
  return data.data as LiaisonDashboardData
}

export interface CdaccDashboardData {
  stats: { total: number; pending: number; approved: number; rejected: number }
  pending_assessments: Row[]
  recent_verified: Row[]
  current_month: string
}

export async function fetchCdaccDashboard() {
  const { data } = await api.get('/api/v1/cdacc-verifier/dashboard')
  return data.data as CdaccDashboardData
}

export interface WorkshopDashboardData {
  inv_total: number
  inv_low: number
  inv_damaged: number
  pending_clearances: number
  recent_items: Row[]
  dept_name: string | null
}

export async function fetchWorkshopDashboard() {
  const { data } = await api.get('/api/v1/workshop-technician/dashboard')
  return data.data as WorkshopDashboardData
}

export interface ServiceDeptDashboardData {
  config: {
    label: string
    role_lbl: string
    icon: string
    gradient: string
    accent: string
    light: string
  }
  pending: Row[]
  cleared: Row[]
  rejected: Row[]
}

export async function fetchServiceDeptDashboard() {
  const { data } = await api.get('/api/v1/service-dept/dashboard')
  return data.data as ServiceDeptDashboardData
}

export interface OversightDashboardData {
  stats: Record<string, number>
  departments: Row[]
  department_filter: string
  pending_clearances: Row[]
  completed_clearances: Row[]
  pending_admissions: Row[]
}

export type OversightRole = 'registrar' | 'deputy-principal' | 'quality-assurance'

export async function fetchOversightDashboard(role: OversightRole, department = '') {
  const { data } = await api.get(`/api/v1/admin-oversight/${role}`, {
    params: department ? { department } : undefined,
  })
  return data.data as OversightDashboardData
}
