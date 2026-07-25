/**
 * Shared cross-role list endpoints used by sidebar destinations:
 * clearance, academic trips, and common admin resource lists.
 */
import { Hono } from 'hono'
import type { Context } from 'hono'
import { getServiceClient } from '../lib/supabase'
import { ok, err } from '../lib/responses'
import { requireAuth, requireRole } from '../middleware/auth'
import type { Env, AppVariables } from '../types'

const shared = new Hono<{ Bindings: Env; Variables: AppVariables }>()

type Row = Record<string, unknown>

shared.get('/clearance/approver', requireAuth, async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('clearance_approvals')
    .select(
      '*, clearance_requests(status, department_id, user_profiles:user_profiles!clearance_requests_student_id_fkey(full_name, admission_no))',
    )
    .eq('approver_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(100)

  const pending = ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const req = (row.clearance_requests as Record<string, unknown>) || {}
    return {
      ...row,
      user_profiles: req.user_profiles || {},
    }
  })
  return ok(c, { pending })
})

shared.get('/clearance/student', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('clearance_requests')
    .select('*, courses(name)')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })
  return ok(c, { requests: data ?? [] })
})

shared.get('/clearance/service-dept', requireAuth, async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const role = user.role
  const catMap: Record<string, string[]> = {
    library_hod: ['svc_library'],
    sports_hod: ['svc_games'],
    service_clearance_officer: ['svc_service', 'service'],
  }
  const cats = catMap[role]
  if (!cats) {
    // Fall back to any pending approvals for this user.
    const { data } = await db
      .from('clearance_approvals')
      .select('*, clearance_requests(user_profiles:user_profiles!clearance_requests_student_id_fkey(full_name, admission_no))')
      .eq('approver_id', user.id)
      .eq('status', 'pending')
      .limit(100)
    return ok(c, { pending: data ?? [] })
  }

  const { data } = await db
    .from('clearance_approvals')
    .select(
      '*, clearance_requests(status, user_profiles:user_profiles!clearance_requests_student_id_fkey(full_name, admission_no))',
    )
    .in('approver_category', cats)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(100)

  const pending = ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const req = (row.clearance_requests as Record<string, unknown>) || {}
    return { ...row, user_profiles: req.user_profiles || {} }
  })
  return ok(c, { pending })
})

shared.get('/academic-trips', requireAuth, async (c) => {
  const db = getServiceClient(c.env)
  const { data, error } = await db
    .from('academic_trips')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) {
    // Table name may vary; try trip_reports fallback.
    const alt = await db.from('trip_reports').select('*').order('created_at', { ascending: false }).limit(200)
    return ok(c, { trips: alt.data ?? [] })
  }
  return ok(c, { trips: data ?? [] })
})

shared.get('/academic-trips/:id', requireAuth, async (c) => {
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const { data: trip, error } = await db.from('academic_trips').select('*').eq('id', id).maybeSingle()
  if (error || !trip) return err(c, 'Trip not found.', 404)
  const media = await db
    .from('academic_trip_media')
    .select('*')
    .eq('trip_id', id)
    .order('created_at', { ascending: false })
  return ok(c, { trip, media: media.data ?? [] })
})

/* ── Super / Dept admin resource lists ───────────────────────────────────── */

shared.get('/super-admin/users', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const role = (c.req.query('role') ?? '').trim()
  let q = db
    .from('user_profiles')
    .select('id, full_name, email, role, admission_no, staff_no, is_active, department_id, departments(name)')
    .order('full_name')
    .limit(500)
  if (role) q = q.eq('role', role)
  const { data } = await q
  return ok(c, { users: data ?? [] })
})

shared.get('/super-admin/departments', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db.from('departments').select('*').order('name')
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/courses', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db.from('courses').select('*, departments(name)').order('name')
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/classes', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db.from('classes').select('*, departments(name), courses(name)').order('name')
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/units', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db.from('units').select('*, departments(name)').order('code').limit(1000)
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/assessments', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('assessments')
    .select('*, user_profiles(full_name, admission_no), units(name, code)')
    .order('uploaded_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/attendance', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('attendance')
    .select('*, user_profiles(full_name, admission_no), units(name, code), classes(name)')
    .order('attendance_date', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/clearances', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('clearance_requests')
    .select(
      '*, departments(name), courses(name), user_profiles:user_profiles!clearance_requests_student_id_fkey(full_name, admission_no)',
    )
    .order('created_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/exam-bookings', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('exam_bookings')
    .select('*, units(name, code), user_profiles!exam_bookings_student_id_fkey(full_name, admission_no)')
    .order('created_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/marks', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('marks')
    .select('*, units(name, code), user_profiles!marks_student_id_fkey(full_name, admission_no), classes(name)')
    .order('created_at', { ascending: false })
    .limit(300)
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/attachments', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('industrial_attachments')
    .select('*, user_profiles(full_name, admission_no), companies(name)')
    .order('created_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/companies', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db.from('companies').select('*').order('name')
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/logs', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('audit_logs')
    .select('*, user_profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/logbooks', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('digital_logbook')
    .select('*, user_profiles(full_name, admission_no)')
    .order('created_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/notices', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db.from('notices').select('*').order('created_at', { ascending: false }).limit(100)
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/biometric-scanners', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db.from('biometric_scanners').select('*').order('created_at', { ascending: false })
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/credentials', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('user_profiles')
    .select('id, full_name, email, role, admission_no, staff_no, must_change_password, is_active')
    .order('full_name')
    .limit(500)
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/trainees-documents', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('trainee_documents')
    .select('*, user_profiles(full_name, admission_no)')
    .order('created_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/class-list', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db.from('classes').select('*, departments(name), courses(name)').order('name')
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/trainee-search', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const q = (c.req.query('q') ?? '').trim()
  let query = db
    .from('user_profiles')
    .select('id, full_name, admission_no, email, departments(name)')
    .eq('role', 'student')
    .order('full_name')
    .limit(100)
  if (q) query = query.or(`full_name.ilike.%${q}%,admission_no.ilike.%${q}%`)
  const { data } = await query
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/assessment-sheet', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('assessments')
    .select('*, user_profiles(full_name, admission_no), units(name, code), classes(name)')
    .order('uploaded_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/trainer-poe', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('trainer_documents')
    .select('*, user_profiles(full_name, staff_no)')
    .order('created_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/attachment-marks', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('attachment_grades')
    .select('*, industrial_attachments(user_profiles(full_name, admission_no), companies(name))')
    .order('created_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/mentoring-tools', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('mentoring_tool_uploads')
    .select('*, companies(name)')
    .order('created_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/gis-tracking', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('location_logs')
    .select('*, industrial_attachments(user_profiles(full_name, admission_no), companies(name))')
    .order('created_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/service-clearance', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const cat = (c.req.query('cat') ?? '').trim()
  let q = db
    .from('clearance_approvals')
    .select(
      '*, clearance_requests(user_profiles:user_profiles!clearance_requests_student_id_fkey(full_name, admission_no))',
    )
    .order('created_at', { ascending: false })
    .limit(200)
  if (cat) q = q.eq('approver_category', cat)
  const { data } = await q
  return ok(c, { items: data ?? [] })
})

shared.get('/super-admin/import', requireRole('super_admin'), async (c) => ok(c, { items: [] }))

/* Dept-admin mirrors (scoped where possible) */
async function deptIdFor(c: { get: (k: 'user') => { department_id: string | null } }) {
  return c.get('user').department_id
}

shared.get('/dept-admin/courses', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const deptId = await deptIdFor(c)
  if (!deptId) return err(c, 'No department assigned.', 400)
  const { data } = await db.from('courses').select('*').eq('department_id', deptId).order('name')
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/classes', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const deptId = await deptIdFor(c)
  if (!deptId) return err(c, 'No department assigned.', 400)
  const { data } = await db.from('classes').select('*, courses(name)').eq('department_id', deptId).order('name')
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/trainers', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const deptId = await deptIdFor(c)
  if (!deptId) return err(c, 'No department assigned.', 400)
  const { data } = await db
    .from('user_profiles')
    .select('id, full_name, email, staff_no, is_active')
    .eq('role', 'trainer')
    .eq('department_id', deptId)
    .order('full_name')
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/students', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const deptId = await deptIdFor(c)
  if (!deptId) return err(c, 'No department assigned.', 400)
  const { data } = await db
    .from('user_profiles')
    .select('id, full_name, admission_no, email, is_active')
    .eq('role', 'student')
    .eq('department_id', deptId)
    .order('full_name')
    .limit(500)
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/units', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const deptId = await deptIdFor(c)
  if (!deptId) return err(c, 'No department assigned.', 400)
  const { data } = await db.from('units').select('*').eq('department_id', deptId).order('code')
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/attendance', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const deptId = await deptIdFor(c)
  if (!deptId) return err(c, 'No department assigned.', 400)
  const { data: units } = await db.from('units').select('id').eq('department_id', deptId)
  const unitIds = ((units ?? []) as { id: string }[]).map((u) => u.id)
  if (!unitIds.length) return ok(c, { items: [] })
  const { data } = await db
    .from('attendance')
    .select('*, user_profiles(full_name, admission_no), units(name, code), classes(name)')
    .in('unit_id', unitIds)
    .order('attendance_date', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/exam-bookings', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('exam_bookings')
    .select('*, units(name, code), user_profiles!exam_bookings_student_id_fkey(full_name, admission_no)')
    .order('created_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/marks', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const deptId = await deptIdFor(c)
  if (!deptId) return err(c, 'No department assigned.', 400)
  const { data: units } = await db.from('units').select('id').eq('department_id', deptId)
  const unitIds = ((units ?? []) as { id: string }[]).map((u) => u.id)
  if (!unitIds.length) return ok(c, { items: [] })
  const { data } = await db
    .from('marks')
    .select('*, units(name, code), user_profiles!marks_student_id_fkey(full_name, admission_no), classes(name)')
    .in('unit_id', unitIds)
    .order('created_at', { ascending: false })
    .limit(300)
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/attachments', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const deptId = await deptIdFor(c)
  let q = db
    .from('industrial_attachments')
    .select('*, user_profiles(full_name, admission_no), companies(name)')
    .order('created_at', { ascending: false })
    .limit(200)
  if (deptId) q = q.eq('department_id', deptId)
  const { data } = await q
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/companies', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db.from('companies').select('*').order('name')
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/logbooks', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('digital_logbook')
    .select('*, user_profiles(full_name, admission_no)')
    .order('created_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/trainees-documents', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('trainee_documents')
    .select('*, user_profiles(full_name, admission_no)')
    .order('created_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/credentials', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const deptId = await deptIdFor(c)
  if (!deptId) return err(c, 'No department assigned.', 400)
  const { data } = await db
    .from('user_profiles')
    .select('id, full_name, email, role, admission_no, staff_no, must_change_password, is_active')
    .eq('department_id', deptId)
    .order('full_name')
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/assign-units', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const deptId = await deptIdFor(c)
  if (!deptId) return err(c, 'No department assigned.', 400)
  const { data } = await db
    .from('unit_assignments')
    .select('*, units(name, code), user_profiles(full_name), classes(name)')
    .order('created_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/class-list', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const deptId = await deptIdFor(c)
  if (!deptId) return err(c, 'No department assigned.', 400)
  const { data } = await db.from('classes').select('*, courses(name)').eq('department_id', deptId).order('name')
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/trainee-search', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const deptId = await deptIdFor(c)
  if (!deptId) return err(c, 'No department assigned.', 400)
  const { data } = await db
    .from('user_profiles')
    .select('id, full_name, admission_no, email')
    .eq('role', 'student')
    .eq('department_id', deptId)
    .order('full_name')
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/assessment-sheet', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('assessments')
    .select('*, user_profiles(full_name, admission_no), units(name, code), classes(name)')
    .order('uploaded_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/trainer-documents', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('trainer_documents')
    .select('*, user_profiles(full_name, staff_no)')
    .order('created_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/trainee-poe', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('assessments')
    .select('*, user_profiles(full_name, admission_no), units(name, code)')
    .order('uploaded_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/attachment-marks', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('attachment_grades')
    .select('*, industrial_attachments(user_profiles(full_name, admission_no), companies(name))')
    .order('created_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/mentoring-tools', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('mentoring_tool_uploads')
    .select('*, companies(name)')
    .order('created_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/gis-tracking', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('location_logs')
    .select('*, industrial_attachments(user_profiles(full_name, admission_no), companies(name))')
    .order('created_at', { ascending: false })
    .limit(200)
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/fingerprint-registration', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const deptId = await deptIdFor(c)
  if (!deptId) return err(c, 'No department assigned.', 400)
  const { data } = await db
    .from('user_profiles')
    .select('id, full_name, admission_no, fingerprint_registered')
    .eq('role', 'student')
    .eq('department_id', deptId)
    .order('full_name')
    .limit(500)
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/notices', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db.from('notices').select('*').order('created_at', { ascending: false }).limit(100)
  return ok(c, { items: data ?? [] })
})

shared.get('/dept-admin/import', requireRole('dept_admin'), async (c) => ok(c, { items: [] }))

shared.get('/super-admin/users/:id', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const { data } = await db
    .from('user_profiles')
    .select('*, departments(name)')
    .eq('id', id)
    .maybeSingle()
  if (!data) return err(c, 'User not found.', 404)
  return ok(c, { user: data })
})

const MIN_TRAINERS = 7

function clearanceSerial(requestId: string): string {
  const year = new Date().getFullYear()
  const hex8 = requestId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `TTTI/CLR/${year}/${hex8}`
}

shared.get('/clearance/verify', async (c) => {
  const serial = (c.req.query('serial') ?? '').trim().toUpperCase()
  if (!serial) return ok(c, { serial_number: '', result: null, error: null })
  return verifyClearanceSerial(c, serial)
})

shared.get('/clearance/verify/:serial', async (c) => {
  const serial = c.req.param('serial').trim().toUpperCase()
  return verifyClearanceSerial(c, serial)
})

async function verifyClearanceSerial(c: Context<{ Bindings: Env; Variables: AppVariables }>, serial: string) {
  const db = getServiceClient(c.env)
  let rows: Row[] = []
  try {
    const { data } = await db
      .from('clearance_requests')
      .select(
        '*, courses(name, code), departments(name), ' +
          'user_profiles:user_profiles!clearance_requests_student_id_fkey(full_name, admission_no)',
      )
      .eq('serial_number', serial)
    rows = ((data ?? []) as unknown as Row[])
  } catch {
    /* column may be absent */
  }

  if (!rows.length) {
    const { data: completed } = await db
      .from('clearance_requests')
      .select(
        '*, courses(name, code), departments(name), ' +
          'user_profiles:user_profiles!clearance_requests_student_id_fkey(full_name, admission_no)',
      )
      .eq('status', 'completed')
      .limit(500)
    rows = ((completed ?? []) as unknown as Row[]).filter((row) => clearanceSerial(String(row.id)) === serial)
  }

  if (!rows.length) {
    return ok(c, {
      serial_number: serial,
      result: null,
      error: `No completed clearance found with serial number '${serial}'.`,
    })
  }

  const cr = rows[0]
  if (cr.status !== 'completed') {
    return ok(c, {
      serial_number: serial,
      result: null,
      error: `Clearance with serial ${serial} exists but is not yet completed.`,
    })
  }

  return ok(c, {
    serial_number: serial,
    result: { ...cr, _serial: (cr.serial_number as string) || clearanceSerial(String(cr.id)) },
    error: null,
  })
}

shared.get('/clearance/certificate/:request_id', requireAuth, async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const requestId = c.req.param('request_id')
  const { data: cr } = await db
    .from('clearance_requests')
    .select(
      '*, courses(name, code), departments(name), ' +
        'user_profiles:user_profiles!clearance_requests_student_id_fkey(full_name, admission_no, email, mobile_number)',
    )
    .eq('id', requestId)
    .maybeSingle()
  if (!cr) return err(c, 'Clearance request not found.', 404)

  const row = cr as unknown as Row
  if (user.role === 'student' && row.student_id !== user.id) {
    return err(c, 'Forbidden.', 403, 'forbidden')
  }
  if (user.role === 'dept_admin' && row.department_id && row.department_id !== user.department_id) {
    return err(c, 'Forbidden.', 403, 'forbidden')
  }

  const serial = (row.serial_number as string) || clearanceSerial(String(row.id))
  const { data: approvals } = await db
    .from('clearance_approvals')
    .select('id, approver_category, status, approved_at, comments')
    .eq('clearance_request_id', requestId)
    .order('created_at')

  return ok(c, {
    clearance: row,
    student: row.user_profiles ?? {},
    serial,
    approvals: approvals ?? [],
  })
})

shared.get('/clearance/manage-trainers/:request_id', requireRole('dept_admin'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const requestId = c.req.param('request_id')
  const { data: cr } = await db
    .from('clearance_requests')
    .select(
      'id, student_id, status, stage, department_id, ' +
        'courses(name, code), departments(name), ' +
        'user_profiles:user_profiles!clearance_requests_student_id_fkey(full_name, admission_no)',
    )
    .eq('id', requestId)
    .maybeSingle()
  if (!cr) return err(c, 'Clearance request not found.', 404)
  const row = cr as unknown as Row
  if (row.department_id !== user.department_id) return err(c, 'Forbidden.', 403, 'forbidden')

  const { data: trainerRows } = await db
    .from('clearance_approvals')
    .select('id, approver_id, approver_category, status, is_waived, waived_at, approved_at, comments')
    .eq('clearance_request_id', requestId)
    .eq('approver_category', 'trainer')

  const tRows = (trainerRows ?? []) as Row[]
  const tIds = tRows.map((r) => r.approver_id as string).filter(Boolean)
  let tMap = new Map<string, Row>()
  if (tIds.length) {
    const { data: profiles } = await db.from('user_profiles').select('id, full_name, phone').in('id', tIds)
    tMap = new Map(((profiles ?? []) as Row[]).map((p) => [p.id as string, p]))
  }
  const trainer_approvals = tRows.map((r) => ({
    ...r,
    trainer: tMap.get((r.approver_id as string) ?? '') ?? {},
  }))
  const approved_count = tRows.filter((r) => r.status === 'approved' || r.is_waived).length

  return ok(c, {
    clearance: row,
    trainer_approvals,
    approved_count,
    required_count: Math.min(MIN_TRAINERS, tRows.length),
    stage1_done: Number(row.stage ?? 1) >= 2,
  })
})

export default shared
