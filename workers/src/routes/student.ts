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
    .select('*, units(name, code), user_profiles!exam_bookings_approved_by_fkey(full_name)')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })

  const items = (data ?? []) as Row[]
  const groups = new Map<
    string,
    {
      serial_number: string
      created_at: string
      exam_session: string
      status: string
      approved_at: string
      rejection_reason: string
      reviewer: string
      bookings: Row[]
      _statuses: string[]
    }
  >()

  for (const b of items) {
    const sn = String(b.serial_number || b.id)
    let g = groups.get(sn)
    if (!g) {
      g = {
        serial_number: sn,
        created_at: String(b.created_at || ''),
        exam_session: String(b.exam_session || ''),
        status: String(b.status || 'pending'),
        approved_at: String(b.approved_at || ''),
        rejection_reason: String(b.rejection_reason || ''),
        reviewer: String(((b.user_profiles as Row | null)?.full_name as string) || ''),
        bookings: [],
        _statuses: [],
      }
      groups.set(sn, g)
    }
    g.bookings.push(b)
    g._statuses.push(String(b.status || 'pending'))
  }

  const booking_groups = [...groups.values()].map((g) => {
    const sts = new Set(g._statuses)
    let status = 'pending'
    if (sts.has('pending')) status = 'pending'
    else if (sts.has('rejected') && sts.size === 1) status = 'rejected'
    else if (sts.has('rejected')) status = 'pending'
    else if (sts.has('approved')) status = 'approved'
    else if (sts.has('completed')) status = 'completed'
    else status = [...sts][0] || 'pending'
    const { _statuses: _, ...rest } = g
    return { ...rest, status }
  })

  return ok(c, { items, booking_groups })
})

const PERSONAL_DOC_TYPES = [
  'passport_photo',
  'admission_letter',
  'medical_form',
  'personal_data_form',
  'declaration_form',
  'kcse_result_slip',
  'kcse_certificate',
  'kcpe_result_slip',
  'birth_certificate',
  'national_id',
  'guardian_id',
  'consent_form',
  'most_recent_result_slip',
] as const

student.get('/student/documents', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)

  const { data: student } = await db.from('user_profiles').select('*').eq('id', user.id).maybeSingle()

  const { data: enrollmentRows } = await db
    .from('enrollments')
    .select('*, classes(id, name, course_id)')
    .eq('student_id', user.id)
    .limit(1)
  const enrollment = ((enrollmentRows ?? []) as Row[])[0] || null
  const classData = (enrollment?.classes as Row | null) || null

  let courseName = ''
  let departmentName = ''
  if (classData?.course_id) {
    const { data: course } = await db
      .from('courses')
      .select('*, departments(name)')
      .eq('id', classData.course_id as string)
      .maybeSingle()
    courseName = String((course as Row | null)?.name || '')
    departmentName = String(((course as Row | null)?.departments as Row | null)?.name || '')
  }

  const { data: docsRaw } = await db
    .from('student_personal_documents')
    .select('*')
    .eq('student_id', user.id)
    .order('updated_at', { ascending: false })

  const documentsList = (docsRaw ?? []) as Row[]
  const documents: Record<string, Row> = {}
  for (const d of documentsList) {
    documents[String(d.document_type || '')] = d
  }

  // Keep legacy trainee_documents list for older SPA table views
  const { data: legacyDocs } = await db
    .from('trainee_documents')
    .select('*')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })

  return ok(c, {
    student: student ?? {},
    course_name: courseName,
    department_name: departmentName,
    documents,
    documents_list: documentsList,
    total_doc_types: PERSONAL_DOC_TYPES.length,
    doc_types: [...PERSONAL_DOC_TYPES],
    items: legacyDocs ?? [],
  })
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

  const { data: student } = await db.from('user_profiles').select('*').eq('id', user.id).maybeSingle()

  const { data: enrollmentRows } = await db
    .from('enrollments')
    .select('*, classes(id, name, course_id)')
    .eq('student_id', user.id)
    .limit(1)

  const enrollment = ((enrollmentRows ?? []) as Row[])[0] || null
  const classData = (enrollment?.classes as Row | null) || null
  const classId = (enrollment?.class_id as string | undefined) || (classData?.id as string | undefined) || null

  let courseName = ''
  let departmentName = ''
  if (classData?.course_id) {
    const { data: course } = await db
      .from('courses')
      .select('*, departments(name)')
      .eq('id', classData.course_id as string)
      .maybeSingle()
    courseName = String((course as Row | null)?.name || '')
    departmentName = String(((course as Row | null)?.departments as Row | null)?.name || '')
  }

  const units: Row[] = []
  const marksByUnit: Record<string, Row> = {}
  if (classId) {
    const { data: cuRows } = await db
      .from('class_units')
      .select('*, units(id, name, code, unit_cost)')
      .eq('class_id', classId)
    for (const row of (cuRows ?? []) as Row[]) {
      const unit = { ...((row.units as Row) || {}) }
      unit.inferred_type = inferUnitTypeFromCode(String(unit.code || ''))
      units.push({ ...row, units: unit })
    }
    const unitIds = units
      .map((u) => ((u.units as Row | null)?.id as string | undefined))
      .filter(Boolean) as string[]
    if (unitIds.length) {
      const { data: allMarks } = await db
        .from('marks')
        .select('id, unit_id, grade, marks_obtained, term, year')
        .eq('student_id', user.id)
        .in('unit_id', unitIds)
        .order('year', { ascending: false })
        .order('created_at', { ascending: false })
      for (const m of (allMarks ?? []) as Row[]) {
        const uid = String(m.unit_id || '')
        if (uid && !marksByUnit[uid]) marksByUnit[uid] = m
      }
    }
  }

  const { data: documentsData } = await db
    .from('student_personal_documents')
    .select('*')
    .eq('student_id', user.id)
  const documents: Record<string, Row> = {}
  for (const doc of (documentsData ?? []) as Row[]) {
    documents[String(doc.document_type || '')] = doc
  }
  const requiredDocs = ['national_id', 'birth_certificate', 'kcse_certificate', 'passport_photo']
  const missingDocuments = requiredDocs.some((k) => !documents[k])
  const canDownload = !missingDocuments && units.length > 0

  const { data: existingBookings } = await db
    .from('exam_bookings')
    .select('*, units(name, code), user_profiles!exam_bookings_approved_by_fkey(full_name)')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return ok(c, {
    student: student ?? {},
    course_name: courseName,
    department_name: departmentName,
    class_id: classId,
    units,
    marks_by_unit: marksByUnit,
    documents,
    missing_documents: missingDocuments,
    can_download: canDownload,
    existing_bookings: existingBookings ?? [],
    // legacy key used by older SPA stub
    items: units.map((u) => u.units).filter(Boolean),
  })
})

function inferUnitTypeFromCode(code: string): string {
  const raw = String(code || '')
    .trim()
    .toUpperCase()
  if (!raw) return 'Core'
  const normalized = raw.replace(/[^A-Z0-9]+/g, '/').replace(/^\/+|\/+$/g, '')
  if (/(^|\/)CC(\/|$|\d)/.test(normalized)) return 'Common'
  if (/(^|\/)BC(\/|$|\d)/.test(normalized)) return 'Basic'
  if (/(^|\/)CR(\/|$|\d)/.test(normalized)) return 'Core'
  const parts = normalized.split('/').filter(Boolean)
  for (const part of parts) {
    if (part === 'CC' || part === 'COMMON') return 'Common'
    if (part === 'BC' || part === 'BASIC') return 'Basic'
    if (part === 'CR' || part === 'CORE') return 'Core'
  }
  return 'Core'
}

student.get('/student/upload-assessment-form', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { data: enrollment } = await db
    .from('enrollments')
    .select('class_id')
    .eq('student_id', user.id)
    .limit(1)
    .maybeSingle()
  const classId = (enrollment as Row | null)?.class_id as string | undefined
  if (!classId) return ok(c, { class_units: [], class_id: null })
  const { data } = await db
    .from('class_units')
    .select('unit_id, units(id, name, code)')
    .eq('class_id', classId)
  return ok(c, { class_units: data ?? [], class_id: classId })
})

student.get('/student/my-files', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { data: assessments } = await db
    .from('assessments')
    .select('*, classes(name), units(name, code)')
    .eq('student_id', user.id)
    .order('uploaded_at', { ascending: false })
  const list = (assessments ?? []) as Row[]
  const ids = list.map((a) => a.id as string)
  const evCount = new Map<string, number>()
  const evSize = new Map<string, number>()
  if (ids.length) {
    const { data: evRows } = await db.from('evidence').select('assessment_id, file_size').in('assessment_id', ids)
    for (const ev of (evRows ?? []) as Row[]) {
      const aid = ev.assessment_id as string
      evCount.set(aid, (evCount.get(aid) ?? 0) + 1)
      evSize.set(aid, (evSize.get(aid) ?? 0) + Number(ev.file_size ?? 0))
    }
  }
  const items = list.map((a) => ({
    ...a,
    evidence_count: evCount.get(a.id as string) ?? 0,
    evidence_size: evSize.get(a.id as string) ?? 0,
  }))
  return ok(c, { items })
})

student.get('/student/units/:unit_id', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const unitId = c.req.param('unit_id')
  const { data: unit } = await db.from('units').select('*').eq('id', unitId).maybeSingle()
  if (!unit) return err(c, 'Unit not found.', 404)
  const { data: records } = await db
    .from('attendance')
    .select('*')
    .eq('student_id', user.id)
    .eq('unit_id', unitId)
    .order('attendance_date', { ascending: false })
  const list = (records ?? []) as Row[]
  const total = list.length
  const present = list.filter((r) => r.status === 'present').length
  return ok(c, {
    unit,
    records: list,
    total,
    present,
    absent: total - present,
    pct: total ? Math.round((present / total) * 1000) / 10 : 0,
  })
})

student.get('/student/portfolio-view', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { data: enrollment } = await db.from('enrollments').select('class_id').eq('student_id', user.id).limit(1)
  const classId = ((enrollment ?? []) as Row[])[0]?.class_id as string | undefined
  let classUnits: Row[] = []
  if (classId) {
    const { data } = await db.from('class_units').select('*, units(name, code)').eq('class_id', classId)
    classUnits = (data ?? []) as Row[]
  }
  const { data: submissions } = await db
    .from('assessments')
    .select('*, units(name, code)')
    .eq('student_id', user.id)
    .order('uploaded_at', { ascending: false })
  const items = (submissions ?? []) as Row[]
  const stats = {
    total: items.length,
    pending: items.filter((p) => p.status === 'pending').length,
    approved: items.filter((p) => p.status === 'approved').length,
    rejected: items.filter((p) => p.status === 'rejected').length,
  }
  return ok(c, { items, class_units: classUnits, stats })
})

student.get('/student/upload-poe-form', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { data: profile } = await db.from('user_profiles').select('*').eq('id', user.id).maybeSingle()
  const { data: enrollment } = await db.from('enrollments').select('class_id, classes(id, name)').eq('student_id', user.id).limit(1)
  const en = ((enrollment ?? []) as Row[])[0]
  const classId = en?.class_id as string | undefined
  let units: Row[] = []
  if (classId) {
    const { data } = await db.from('class_units').select('*, units(name, code)').eq('class_id', classId)
    units = (data ?? []) as Row[]
  }
  return ok(c, {
    student: profile ?? {},
    classes: en?.classes ? [en.classes] : [],
    units,
    current_year: currentYearEAT(),
  })
})

student.get('/student/assessments/:id', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const { data: assessment } = await db
    .from('assessments')
    .select('*, classes(name), units(name, code)')
    .eq('id', id)
    .eq('student_id', user.id)
    .maybeSingle()
  if (!assessment) return err(c, 'Assessment not found.', 404)
  const { data: evidence } = await db
    .from('evidence')
    .select('*')
    .eq('assessment_id', id)
    .order('uploaded_at', { ascending: false })
  return ok(c, { assessment, evidence: evidence ?? [] })
})

student.get('/student/employment-projects', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { data } = await db
    .from('employment_projects')
    .select('*')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })
  return ok(c, { items: data ?? [] })
})

export default student
