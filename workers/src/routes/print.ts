/**
 * Print payload API — structured JSON for browser-print React pages.
 */
import { Hono } from 'hono'
import { getServiceClient } from '../lib/supabase'
import { ok, err } from '../lib/responses'
import { requireAuth, requireRole } from '../middleware/auth'
import { currentYearEAT } from '../lib/dates'
import {
  buildAssessmentSheetPrintPayload,
  buildClassListPrintPayload,
  buildClearanceFormPayload,
  buildGraduationPrintPayload,
  buildMarksPrintPayload,
  buildStudentUnitReportPrintPayload,
  buildTraineeApprovedBookingsPayload,
  buildTraineeReportPrintPayload,
  buildTrainerMarksPrintPayload,
  buildUnitAttendanceRegister,
} from '../lib/printPayloads'
import type { Env, AppVariables } from '../types'

const print = new Hono<{ Bindings: Env; Variables: AppVariables }>()

type Row = Record<string, unknown>

async function deptIdFor(c: { get: (k: 'user') => Row }) {
  const user = c.get('user')
  return (user.department_id as string | null) ?? null
}

function qstr(c: { req: { query: (k: string) => string | undefined } }, key: string) {
  return (c.req.query(key) ?? '').trim()
}

print.get('/print/marks', requireAuth, async (c) => {
  const user = c.get('user')
  if (!['dept_admin', 'super_admin'].includes(user.role)) {
    return err(c, 'Forbidden.', 403, 'forbidden')
  }
  const db = getServiceClient(c.env)
  const payload = await buildMarksPrintPayload(db, user as unknown as Row, {
    year: qstr(c, 'year') || undefined,
    term: qstr(c, 'term') || undefined,
    class_id: qstr(c, 'class_id') || undefined,
    unit_id: qstr(c, 'unit_id') || undefined,
    trainer_id: qstr(c, 'trainer_id') || undefined,
    admission_no: qstr(c, 'admission_no') || undefined,
  })
  return ok(c, payload)
})

print.get('/print/examination-officer/marks', requireRole('examination_officer'), async (c) => {
  const db = getServiceClient(c.env)
  const year = qstr(c, 'year') || String(currentYearEAT())
  const term = qstr(c, 'term')
  const classId = qstr(c, 'class_id')
  const unitId = qstr(c, 'unit_id')

  let query = db
    .from('marks')
    .select('*, units(name, code), user_profiles!marks_student_id_fkey(full_name, admission_no), classes(name, departments(name))')
    .eq('year', parseInt(year, 10))
  if (term) query = query.eq('term', term)
  if (classId) query = query.eq('class_id', classId)
  if (unitId) query = query.eq('unit_id', unitId)
  const { data } = await query.limit(500)

  return ok(c, {
    marks: data ?? [],
    year,
    term,
    class_id: classId,
    unit_id: unitId,
    generated_at: new Date().toLocaleString('en-GB'),
  })
})

print.get('/print/trainer/marks', requireRole('trainer'), async (c) => {
  const user = c.get('user')
  const classId = qstr(c, 'class_id')
  const unitId = qstr(c, 'unit_id')
  if (!classId || !unitId) return err(c, 'class_id and unit_id are required.', 400)
  const year = parseInt(qstr(c, 'year') || String(currentYearEAT()), 10)
  const term = parseInt(qstr(c, 'term') || '1', 10)
  const db = getServiceClient(c.env)

  const { data: assigned } = await db
    .from('class_units')
    .select('id')
    .eq('class_id', classId)
    .eq('unit_id', unitId)
    .eq('trainer_id', user.id)
    .limit(1)
  if (!assigned?.length) return err(c, 'You are not assigned to this class/unit.', 403, 'forbidden')

  const payload = await buildTrainerMarksPrintPayload(db, user.id, classId, unitId, year, term)
  return ok(c, payload)
})

print.get('/print/unit-attendance', requireAuth, async (c) => {
  const user = c.get('user')
  const classId = qstr(c, 'class_id')
  const unitId = qstr(c, 'unit_id')
  if (!classId || !unitId) return err(c, 'class_id and unit_id are required.', 400)
  const year = parseInt(qstr(c, 'year') || String(currentYearEAT()), 10)
  const term = parseInt(qstr(c, 'term') || '1', 10)
  const db = getServiceClient(c.env)

  let trainerId: string | null = null
  if (user.role === 'trainer') {
    trainerId = user.id
    const { data: assigned } = await db
      .from('class_units')
      .select('id')
      .eq('class_id', classId)
      .eq('unit_id', unitId)
      .eq('trainer_id', user.id)
      .limit(1)
    if (!assigned?.length) return err(c, 'You are not assigned to this class/unit.', 403, 'forbidden')
  } else if (!['dept_admin', 'super_admin'].includes(user.role)) {
    return err(c, 'Forbidden.', 403, 'forbidden')
  }

  const payload = await buildUnitAttendanceRegister(db, { classId, unitId, year, term, trainerId })
  if (!payload) return err(c, 'No attendance records found for this unit in the selected period.', 404)
  return ok(c, payload)
})

print.get('/print/session', requireRole('trainer'), async (c) => {
  const user = c.get('user')
  const classId = qstr(c, 'class_id')
  const unitId = qstr(c, 'unit_id')
  const week = parseInt(qstr(c, 'week') || '0', 10)
  const lesson = qstr(c, 'lesson')
  const year = parseInt(qstr(c, 'year') || String(currentYearEAT()), 10)
  const term = parseInt(qstr(c, 'term') || '1', 10)
  if (!classId || !unitId || !week || !lesson) {
    return err(c, 'class_id, unit_id, week and lesson are required.', 400)
  }

  const db = getServiceClient(c.env)
  const [{ data: cls }, { data: unit }, { data: dept }, { data: records }, { data: events }] =
    await Promise.all([
      db.from('classes').select('name').eq('id', classId).maybeSingle(),
      db.from('units').select('code, name').eq('id', unitId).maybeSingle(),
      user.department_id
        ? db.from('departments').select('name').eq('id', user.department_id).maybeSingle()
        : Promise.resolve({ data: null }),
      db
        .from('attendance')
        .select('*, user_profiles:student_id(full_name, admission_no)')
        .eq('unit_id', unitId)
        .eq('trainer_id', user.id)
        .eq('week', week)
        .eq('lesson', lesson)
        .eq('year', year)
        .eq('term', term)
        .order('attendance_date'),
      db
        .from('class_events')
        .select('*')
        .eq('class_id', classId)
        .eq('week', week)
        .eq('lesson', lesson)
        .eq('year', year)
        .eq('term', term)
        .limit(1),
    ])

  return ok(c, {
    class: cls ?? {},
    unit: unit ?? {},
    department: dept ?? {},
    records: records ?? [],
    active_event: ((events ?? []) as Row[])[0] ?? null,
    week,
    lesson,
    year,
    term,
    trainer_name: user.full_name ?? '',
    generated: new Date().toLocaleString('en-GB'),
  })
})

print.get('/print/graduation-list', requireAuth, async (c) => {
  const user = c.get('user')
  if (!['super_admin', 'dept_admin', 'examination_officer', 'trainer'].includes(user.role)) {
    return err(c, 'Forbidden.', 403, 'forbidden')
  }
  const classId = qstr(c, 'class_id')
  if (!classId) return err(c, 'class_id is required.', 400)
  const year = qstr(c, 'year') ? parseInt(qstr(c, 'year'), 10) : undefined
  const term = qstr(c, 'term') ? parseInt(qstr(c, 'term'), 10) : undefined
  const eligibleOnly = qstr(c, 'eligible_only') === '1' || qstr(c, 'eligible_only') === 'true'

  try {
    const db = getServiceClient(c.env)
    const payload = await buildGraduationPrintPayload(db, classId, year, term, eligibleOnly)
    return ok(c, payload)
  } catch (e) {
    return err(c, e instanceof Error ? e.message : 'Failed to build graduation list.', 400)
  }
})

print.get('/print/class-list', requireAuth, async (c) => {
  const user = c.get('user')
  if (!['dept_admin', 'super_admin'].includes(user.role)) {
    return err(c, 'Forbidden.', 403, 'forbidden')
  }
  const classId = qstr(c, 'class_id')
  if (!classId) return err(c, 'class_id is required.', 400)
  const db = getServiceClient(c.env)

  let deptName = ''
  if (user.role === 'dept_admin') {
    const deptId = await deptIdFor(c)
    if (!deptId) return err(c, 'No department assigned.', 400)
    const { data: dept } = await db.from('departments').select('name').eq('id', deptId).maybeSingle()
    deptName = String((dept as Row)?.name ?? '')
  } else {
    const { data: cls } = await db.from('classes').select('departments(name)').eq('id', classId).maybeSingle()
    deptName = String((((cls as Row)?.departments as Row) ?? {}).name ?? '')
  }

  const payload = await buildClassListPrintPayload(db, classId, deptName)
  return ok(c, payload)
})

print.get('/print/assessment-sheet', requireAuth, async (c) => {
  const user = c.get('user')
  if (!['dept_admin', 'super_admin'].includes(user.role)) {
    return err(c, 'Forbidden.', 403, 'forbidden')
  }
  const classId = qstr(c, 'class_id')
  const unitId = qstr(c, 'unit_id')
  if (!classId || !unitId) return err(c, 'class_id and unit_id are required.', 400)
  const db = getServiceClient(c.env)

  let deptName = ''
  if (user.role === 'dept_admin') {
    const deptId = await deptIdFor(c)
    const { data: dept } = await db.from('departments').select('name').eq('id', deptId).maybeSingle()
    deptName = String((dept as Row)?.name ?? '')
  } else {
    const { data: unit } = await db.from('units').select('departments(name)').eq('id', unitId).maybeSingle()
    deptName = String((((unit as Row)?.departments as Row) ?? {}).name ?? '')
  }

  const payload = await buildAssessmentSheetPrintPayload(db, {
    classId,
    unitId,
    year: qstr(c, 'year') || undefined,
    term: qstr(c, 'term') || undefined,
    minPct: parseInt(qstr(c, 'min_pct') || '80', 10),
    deptName,
  })
  return ok(c, payload)
})

print.get('/print/trainee-report', requireAuth, async (c) => {
  const user = c.get('user')
  if (!['dept_admin', 'super_admin'].includes(user.role)) {
    return err(c, 'Forbidden.', 403, 'forbidden')
  }
  const studentId = qstr(c, 'student_id')
  const unitId = qstr(c, 'unit_id')
  if (!studentId || !unitId) return err(c, 'student_id and unit_id are required.', 400)
  const db = getServiceClient(c.env)

  let deptName = ''
  if (user.role === 'dept_admin') {
    const deptId = await deptIdFor(c)
    const { data: dept } = await db.from('departments').select('name').eq('id', deptId).maybeSingle()
    deptName = String((dept as Row)?.name ?? '')
    const { data: stu } = await db.from('user_profiles').select('department_id').eq('id', studentId).maybeSingle()
    if ((stu as Row)?.department_id !== deptId) return err(c, 'Trainee not in your department.', 403, 'forbidden')
  } else {
    const { data: stu } = await db
      .from('user_profiles')
      .select('departments(name)')
      .eq('id', studentId)
      .maybeSingle()
    deptName = String((((stu as Row)?.departments as Row) ?? {}).name ?? '')
  }

  const payload = await buildTraineeReportPrintPayload(db, studentId, unitId, deptName)
  return ok(c, payload)
})

print.get('/print/student-unit-report', requireRole('student'), async (c) => {
  const unitId = qstr(c, 'unit_id')
  if (!unitId) return err(c, 'unit_id is required.', 400)
  const db = getServiceClient(c.env)
  const user = c.get('user')
  const payload = await buildStudentUnitReportPrintPayload(db, user.id, unitId)
  return ok(c, payload)
})

print.get('/print/trainee-approved-bookings', requireRole('dept_admin'), async (c) => {
  const studentId = qstr(c, 'student_id')
  if (!studentId) return err(c, 'student_id is required.', 400)
  const db = getServiceClient(c.env)
  const deptId = await deptIdFor(c)
  const { data: dept } = await db.from('departments').select('name').eq('id', deptId).maybeSingle()
  const payload = await buildTraineeApprovedBookingsPayload(db, studentId, String((dept as Row)?.name ?? ''))
  return ok(c, payload)
})

print.get('/print/clearance-form', requireAuth, async (c) => {
  const requestId = qstr(c, 'request_id')
  if (!requestId) return err(c, 'request_id is required.', 400)
  const user = c.get('user')
  const db = getServiceClient(c.env)

  const { data: cr } = await db
    .from('clearance_requests')
    .select('student_id, department_id')
    .eq('id', requestId)
    .maybeSingle()
  if (!cr) return err(c, 'Clearance request not found.', 404)
  const row = cr as Row
  if (user.role === 'student' && row.student_id !== user.id) {
    return err(c, 'Forbidden.', 403, 'forbidden')
  }
  if (user.role === 'dept_admin' && row.department_id && row.department_id !== user.department_id) {
    return err(c, 'Forbidden.', 403, 'forbidden')
  }

  try {
    const payload = await buildClearanceFormPayload(db, requestId)
    return ok(c, payload)
  } catch (e) {
    return err(c, e instanceof Error ? e.message : 'Not found.', 404)
  }
})

export default print
