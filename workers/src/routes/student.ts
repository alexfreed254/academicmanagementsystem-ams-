import { Hono } from 'hono'
import { getServiceClient } from '../lib/supabase'
import { ok, err } from '../lib/responses'
import { requireRole } from '../middleware/auth'
import { currentMonthLabelEAT, currentYearEAT } from '../lib/dates'
import { buildMarksTranscriptView } from '../lib/transcript'
import type { Env, AppVariables } from '../types'

const student = new Hono<{ Bindings: Env; Variables: AppVariables }>()
student.use('/student/*', requireRole('student'))

type Row = Record<string, any>

/** CDACC competency grade from a percentage (mirrors api_v1 thresholds). */
const gradeFor = (pct: number): string => (pct >= 80 ? 'M' : pct >= 65 ? 'P' : pct >= 50 ? 'C' : 'NYC')

// ── GET /student/dashboard ────────────────────────────────────────────────────

student.get('/student/dashboard', async (c) => {
  const db = getServiceClient(c.env)
  const user = c.get('user')
  const studentId = user.id
  const stats: Record<string, unknown> = {}
  let attendanceData: Row[] = []
  let recentAssessments: Row[] = []
  let overallPct = 0
  let totalAttended = 0

  try {
    const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0)

    const [
      total,
      pending,
      approved,
      rejected,
      attendanceRes,
      recentRes,
      clearanceRes,
      attachmentsRes,
      logbookCount,
      pendingCompetencies,
      unreadRes,
    ] = await Promise.all([
      count(db.from('assessments').select('id', { count: 'exact', head: true }).eq('student_id', studentId)),
      count(
        db
          .from('assessments')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('status', 'pending'),
      ),
      count(
        db
          .from('assessments')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('status', 'approved'),
      ),
      count(
        db
          .from('assessments')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('status', 'rejected'),
      ),
      db.from('attendance').select('status, attendance_date, units(id, name, code)').eq('student_id', studentId),
      db
        .from('assessments')
        .select('id, status, assessment_type, uploaded_at, units(name), classes(name)')
        .eq('student_id', studentId)
        .order('uploaded_at', { ascending: false })
        .limit(6),
      db
        .from('clearance_requests')
        .select('status, stage')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(8),
      db.from('industrial_attachments').select('status').eq('student_id', studentId),
      count(db.from('digital_logbook').select('id', { count: 'exact', head: true }).eq('student_id', studentId)),
      count(
        db
          .from('competency_tracking')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('competency_status', 'NYC'),
      ).then(
        (n) => n,
        () => 0,
      ),
      db
        .from('notifications')
        .select('*')
        .eq('user_id', studentId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(3),
    ])

    stats.total = total
    stats.pending = pending
    stats.approved = approved
    stats.rejected = rejected

    const rawAttendance = (attendanceRes.data ?? []) as Row[]
    const unitMap = new Map<string, Row>()
    for (const r of rawAttendance) {
      const u = r.units ?? {}
      const uid = u.id
      if (!uid) continue
      if (!unitMap.has(uid)) {
        unitMap.set(uid, {
          id: uid,
          unit_code: u.code ?? '',
          unit_name: u.name ?? '',
          attended: 0,
          total_records: 0,
          last_update: null,
        })
      }
      const entry = unitMap.get(uid)!
      entry.total_records += 1
      if (r.status === 'present') entry.attended += 1
      const dt = r.attendance_date
      if (dt && (!entry.last_update || dt > entry.last_update)) entry.last_update = dt
    }
    attendanceData = [...unitMap.values()]

    const totalRecords = rawAttendance.length
    totalAttended = rawAttendance.filter((r) => r.status === 'present').length
    overallPct = totalRecords > 0 ? Math.round((totalAttended / totalRecords) * 1000) / 10 : 0
    stats.attendance_total = totalRecords
    stats.attendance_percent = overallPct

    recentAssessments = (recentRes.data ?? []) as Row[]

    const cl = (clearanceRes.data ?? []) as Row[]
    const active = cl.find((r) => ['pending', 'in_progress', 'returned', 'completed'].includes(r.status ?? ''))
    stats.clearance_status = active?.status ?? ''
    stats.clearance_stage = active?.stage ?? 0

    const attachments = (attachmentsRes.data ?? []) as Row[]
    stats.attachment_active = attachments.filter((a) => a.status === 'active').length
    stats.attachment_total = attachments.length
    stats.logbook_entries = logbookCount
    stats.pending_competencies = pendingCompetencies

    return ok(c, {
      current_month: currentMonthLabelEAT(),
      student: { full_name: user.full_name, admission_no: user.admission_no },
      stats,
      overall_pct: overallPct,
      total_attended: totalAttended,
      attendance_data: attendanceData,
      recent_assessments: recentAssessments,
      unread_notifications: unreadRes.data ?? [],
    })
  } catch (e) {
    console.error(`[api_v1] student dashboard: ${e}`)
    return err(c, 'Could not load student dashboard.', 500)
  }
})

// ── GET /student/attendance ───────────────────────────────────────────────────

student.get('/student/attendance', async (c) => {
  const db = getServiceClient(c.env)
  const user = c.get('user')
  const { data } = await db
    .from('attendance')
    .select('id, status, attendance_date, week, lesson, term, year, units(name, code)')
    .eq('student_id', user.id)
    .order('attendance_date', { ascending: false })
  const attendanceList = (data ?? []) as Row[]
  const total = attendanceList.length
  const present = attendanceList.filter((a) => a.status === 'present').length
  const percentage = total ? Math.round((present / total) * 1000) / 10 : 0
  return ok(c, {
    attendance: attendanceList,
    total,
    present,
    absent: total - present,
    percentage,
  })
})

// ── GET /student/units ────────────────────────────────────────────────────────

student.get('/student/units', async (c) => {
  const db = getServiceClient(c.env)
  const user = c.get('user')
  const studentId = user.id

  const { data: enrollments } = await db
    .from('enrollments')
    .select('class_id, classes(name)')
    .eq('student_id', studentId)
  const enrollList = (enrollments ?? []) as Row[]
  const classIds = enrollList.map((e) => e.class_id).filter(Boolean)

  let classUnitsData: Row[] = []
  if (classIds.length) {
    const { data } = await db.from('class_units').select('class_id, units(name, code, id)').in('class_id', classIds)
    classUnitsData = (data ?? []) as Row[]
  }

  // One attendance query for all units (replaces Flask's per-unit N+1 loop)
  const { data: attRows } = await db.from('attendance').select('status, unit_id').eq('student_id', studentId)
  const attByUnit = new Map<string, { present: number; total: number }>()
  for (const r of (attRows ?? []) as Row[]) {
    const b = attByUnit.get(r.unit_id) ?? { present: 0, total: 0 }
    b.total += 1
    if (r.status === 'present') b.present += 1
    attByUnit.set(r.unit_id, b)
  }

  const unitsData: Row[] = []
  const seen = new Set<string>()
  for (const cu of classUnitsData) {
    const unit = cu.units ?? {}
    const uid = unit.id
    if (!uid || seen.has(uid)) continue
    seen.add(uid)
    const att = attByUnit.get(uid) ?? { present: 0, total: 0 }
    const pct = att.total ? Math.round((att.present / att.total) * 1000) / 10 : 0
    const className = enrollList.find((e) => e.class_id === cu.class_id)?.classes?.name ?? ''
    unitsData.push({
      id: uid,
      code: unit.code ?? '',
      name: unit.name ?? '',
      class_name: className,
      attended: att.present,
      total: att.total,
      pct,
    })
  }
  return ok(c, { units: unitsData })
})

// ── GET /student/marks ────────────────────────────────────────────────────────

student.get('/student/marks', async (c) => {
  const db = getServiceClient(c.env)
  const user = c.get('user')
  const studentId = user.id
  const year = c.req.query('year') ?? String(currentYearEAT())
  const term = (c.req.query('term') ?? '').trim()

  const [{ data: profileRows }, { data: enrollmentRows }] = await Promise.all([
    db.from('user_profiles').select('full_name, admission_no, mobile_number').eq('id', studentId).limit(1),
    db.from('enrollments').select('class_id, classes(name, departments(name))').eq('student_id', studentId).limit(1),
  ])
  const profile = (profileRows?.[0] ?? {}) as Row

  let className = ''
  let deptName = ''
  let classId: string | null = null
  const enrollment = (enrollmentRows ?? []) as Row[]
  if (enrollment.length) {
    classId = enrollment[0].class_id
    const cls = enrollment[0].classes ?? {}
    className = cls.name ?? ''
    deptName = cls.departments?.name ?? ''
  }

  let assessments: Row[] = []
  if (classId) {
    let q = db
      .from('formative_assessments')
      .select(
        'id, unit_id, assessment_name, assessment_type, max_marks, year, term, ' +
          'units(name, code), ' +
          'trainer:user_profiles!formative_assessments_trainer_id_fkey(full_name)',
      )
      .eq('class_id', classId)
      .eq('year', parseInt(year, 10))
    if (term) q = q.eq('term', parseInt(term, 10))
    const { data } = await q.order('unit_id').order('assessment_type').order('created_at')
    assessments = (data ?? []) as Row[]
  }

  const marksMap = new Map<string, number>()
  if (assessments.length) {
    const aIds = assessments.map((a) => a.id)
    const { data: fm } = await db
      .from('formative_marks')
      .select('assessment_id, marks_obtained')
      .eq('student_id', studentId)
      .in('assessment_id', aIds)
    for (const m of (fm ?? []) as Row[]) marksMap.set(m.assessment_id, m.marks_obtained)
  }

  const byUnit = new Map<string, Row>()
  for (const a of assessments) {
    const uid = a.unit_id
    if (!byUnit.has(uid)) byUnit.set(uid, { unit: a.units ?? {}, term: a.term, assessments: [] })
    const obt = marksMap.get(a.id)
    const mx = parseFloat(String(a.max_marks ?? 100)) || 100
    let pct: number | null = null
    let grade: string | null = null
    if (obt !== undefined && obt !== null) {
      pct = mx ? Math.round((Number(obt) / mx) * 1000) / 10 : 0
      grade = gradeFor(pct)
    }
    byUnit.get(uid)!.assessments.push({
      assessment_name: a.assessment_name ?? '',
      assessment_type: String(a.assessment_type ?? 'OTHER').toUpperCase(),
      term: a.term,
      marks_obtained: obt ?? null,
      max_marks: mx,
      grade,
      pct,
      trainer: a.trainer,
    })
  }

  const unitsData: Row[] = []
  for (const data of byUnit.values()) {
    const entered = (data.assessments as Row[]).filter((a) => a.marks_obtained !== null)
    const totalObt = entered.length
      ? Math.round(entered.reduce((s, a) => s + Number(a.marks_obtained), 0) * 10) / 10
      : 0
    const totalMax = entered.length ? Math.round(entered.reduce((s, a) => s + a.max_marks, 0) * 10) / 10 : 0
    const pct = totalMax ? Math.round((totalObt / totalMax) * 1000) / 10 : 0
    const final = entered.length ? gradeFor(pct) : '—'
    Object.assign(data, {
      total_obt: totalObt,
      total_max: totalMax,
      pct,
      final_grade: final,
      has_marks: entered.length > 0,
    })
    unitsData.push(data)
  }

  const scored = unitsData.filter((u) => u.has_marks)
  const overall = scored.length
    ? Math.round((scored.reduce((s, u) => s + u.pct, 0) / scored.length) * 10) / 10
    : 0
  const passed = scored.filter((u) => ['M', 'P', 'C'].includes(u.final_grade)).length

  const table = buildMarksTranscriptView(unitsData)

  return ok(c, {
    profile,
    class_name: className,
    dept_name: deptName,
    year,
    term,
    units_data: table.units_rows,
    oral_labels: table.oral_labels,
    practical_labels: table.practical_labels,
    written_labels: table.written_labels,
    overall,
    passed,
    scored_units: scored.length,
  })
})

student.get('/student/assessments', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('assessments')
    .select('*, units(name, code)')
    .eq('student_id', user.id)
    .order('uploaded_at', { ascending: false })
  return ok(c, { items: data ?? [] })
})

student.get('/student/exam-bookings', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('exam_bookings')
    .select('*, units(name, code)')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })
  return ok(c, { items: data ?? [] })
})

student.get('/student/documents', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('trainee_documents')
    .select('*')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })
  return ok(c, { items: data ?? [] })
})

student.get('/student/industrial-attachment', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('industrial_attachments')
    .select('*, companies(name, address), units(name, code)')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })
  return ok(c, { items: data ?? [] })
})

student.get('/student/logbook', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('digital_logbook')
    .select('*')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })
  return ok(c, { items: data ?? [] })
})

student.get('/student/attachment-marks', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { data: atts } = await db.from('industrial_attachments').select('id').eq('student_id', user.id)
  const ids = ((atts ?? []) as { id: string }[]).map((a) => a.id)
  if (!ids.length) return ok(c, { items: [] })
  const { data } = await db.from('attachment_grades').select('*').in('attachment_id', ids)
  return ok(c, { items: data ?? [] })
})

student.get('/student/mentoring-tool', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { data: atts } = await db
    .from('industrial_attachments')
    .select('company_id')
    .eq('student_id', user.id)
  const companyIds = [
    ...new Set(((atts ?? []) as { company_id?: string }[]).map((a) => a.company_id).filter(Boolean)),
  ] as string[]
  if (!companyIds.length) return ok(c, { items: [] })
  const { data } = await db
    .from('mentoring_tool_uploads')
    .select('*, companies(name)')
    .in('company_id', companyIds)
  return ok(c, { items: data ?? [] })
})

student.get('/student/employment-status', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('employment_status')
    .select('*')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })
  return ok(c, { items: data ?? [] })
})

student.get('/student/portfolio', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('assessments')
    .select('*, units(name, code)')
    .eq('student_id', user.id)
    .eq('status', 'approved')
    .order('uploaded_at', { ascending: false })
  return ok(c, { items: data ?? [] })
})

student.get('/student/summative', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('summative_results')
    .select('*, units(name, code)')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })
  return ok(c, { items: data ?? [] })
})

student.get('/student/exam-booking-form', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('units')
    .select('id, name, code')
    .limit(100)
  return ok(c, { items: data ?? [], student_id: user.id })
})

export default student
