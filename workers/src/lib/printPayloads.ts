/**
 * Structured payloads for browser-print React report pages.
 * Ports logic from Flask Jinja PDF templates / unit_attendance_register.py.
 */
import { currentYearEAT } from './dates'
import type { SupabaseClient } from '@supabase/supabase-js'

type Row = Record<string, unknown>
type Db = SupabaseClient

export function computeGrade(obtained: unknown, maxMarks: unknown): { pct: number; grade: string } {
  const max = parseFloat(String(maxMarks ?? 100)) || 100
  const obt = obtained === null || obtained === undefined ? NaN : parseFloat(String(obtained))
  if (Number.isNaN(obt) || max <= 0) return { pct: 0, grade: '—' }
  const pct = Math.round((obt / max) * 1000) / 10
  const grade = pct >= 80 ? 'M' : pct >= 65 ? 'P' : pct >= 50 ? 'C' : 'NYC'
  return { pct, grade }
}

function normLesson(lesson: unknown): string {
  const s = String(lesson ?? '').trim()
  return ['1', '2', '3', '4'].includes(s) ? `L${s}` : s
}

function parseTs(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  const text = String(value).replace('Z', '+00:00')
  const d = new Date(text)
  if (!Number.isNaN(d.getTime())) return d
  return null
}

function fmtSessionTime(dt: Date | null) {
  if (!dt) return { date_label: '—', time_label: '', full: '' }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const dateLabel = `${String(dt.getDate()).padStart(2, '0')} ${months[dt.getMonth()]}`
  const hh = String(dt.getHours()).padStart(2, '0')
  const mm = String(dt.getMinutes()).padStart(2, '0')
  return { date_label: dateLabel, time_label: `${hh}:${mm}`, full: `${dateLabel} ${dt.getFullYear()} ${hh}:${mm}` }
}

function nowGenerated(): string {
  return new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function nowShort(): string {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const PASSING = new Set(['mastery', 'proficient', 'competent'])

function normalizeCompetence(raw: unknown): string | null {
  const s = String(raw ?? '').toLowerCase().trim()
  if (!s) return null
  if (s === 'm' || s === 'mastery') return 'mastery'
  if (s === 'p' || s === 'proficient') return 'proficient'
  if (s === 'c' || s === 'competent') return 'competent'
  if (s === 'nyc' || s === 'not_yet_competent') return 'not_yet_competent'
  if (s === 'crnm') return 'crnm'
  return s
}

export async function fetchFormativeMarks(
  db: Db,
  opts: {
    deptId?: string | null
    year: string
    term?: string
    classId?: string
    unitId?: string
    trainerId?: string
    admissionNo?: string
  },
) {
  let unitIds: string[] = []
  if (opts.unitId) {
    unitIds = [opts.unitId]
  } else if (opts.deptId) {
    const { data: units } = await db.from('units').select('id').eq('department_id', opts.deptId)
    unitIds = ((units ?? []) as Row[]).map((u) => String(u.id))
  } else {
    const { data: units } = await db.from('units').select('id')
    unitIds = ((units ?? []) as Row[]).map((u) => String(u.id))
  }
  if (!unitIds.length) return []

  let faQ = db
    .from('formative_assessments')
    .select(
      'id, unit_id, class_id, trainer_id, assessment_type, assessment_name, max_marks, year, term, created_at, ' +
        'units(name, code, departments(name)), classes(name), ' +
        'trainer:user_profiles!formative_assessments_trainer_id_fkey(full_name)',
    )
    .in('unit_id', unitIds)
    .eq('year', parseInt(opts.year, 10) || currentYearEAT())
  if (opts.term) faQ = faQ.eq('term', parseInt(opts.term, 10))
  if (opts.classId) faQ = faQ.eq('class_id', opts.classId)
  if (opts.trainerId) faQ = faQ.eq('trainer_id', opts.trainerId)

  const { data: fas } = await faQ.order('created_at', { ascending: false })
  const formative = (fas ?? []) as unknown as Row[]
  if (!formative.length) return []

  const faMap = new Map<string, Row>()
  for (const a of formative) faMap.set(String(a.id), a)
  const aIds = [...faMap.keys()]

  const { data: fmRows } = await db
    .from('formative_marks')
    .select(
      'assessment_id, student_id, marks_obtained, ' +
        'student:user_profiles!formative_marks_student_id_fkey(full_name, admission_no)',
    )
    .in('assessment_id', aIds)

  const rows: Row[] = []
  for (const m of (fmRows ?? []) as unknown as Row[]) {
    const fa = faMap.get(String(m.assessment_id)) ?? {}
    const { pct, grade } = computeGrade(m.marks_obtained, fa.max_marks)
    const unit = (fa.units as Row) ?? {}
    rows.push({
      student: m.student ?? {},
      unit,
      dept_name: ((unit.departments as Row) ?? {}).name ?? '',
      class_: fa.classes ?? {},
      trainer: fa.trainer ?? {},
      assessment_name: fa.assessment_name ?? '',
      assessment_type: fa.assessment_type ?? '',
      max_marks: fa.max_marks ?? 100,
      marks_obtained: m.marks_obtained,
      percentage: pct,
      grade,
      year: fa.year,
      term: fa.term,
    })
  }

  let filtered = rows
  if (opts.admissionNo) {
    const q = opts.admissionNo.toUpperCase()
    filtered = rows.filter((r) =>
      String((r.student as Row)?.admission_no ?? '')
        .toUpperCase()
        .includes(q),
    )
  }

  filtered.sort((a, b) => {
    const ak = [
      String(a.dept_name ?? ''),
      String((a.class_ as Row)?.name ?? ''),
      String((a.student as Row)?.full_name ?? ''),
      String((a.unit as Row)?.name ?? ''),
      String(a.assessment_name ?? ''),
    ].join('\0')
    const bk = [
      String(b.dept_name ?? ''),
      String((b.class_ as Row)?.name ?? ''),
      String((b.student as Row)?.full_name ?? ''),
      String((b.unit as Row)?.name ?? ''),
      String(b.assessment_name ?? ''),
    ].join('\0')
    return ak.localeCompare(bk)
  })
  return filtered
}

export async function buildMarksPrintPayload(
  db: Db,
  user: Row,
  query: Record<string, string | undefined>,
) {
  const year = query.year ?? String(currentYearEAT())
  const term = query.term ?? ''
  const classId = query.class_id ?? ''
  const unitId = query.unit_id ?? ''
  const trainerId = query.trainer_id ?? ''
  const deptId = user.role === 'super_admin' ? null : (user.department_id as string | null)

  const marks = await fetchFormativeMarks(db, {
    deptId,
    year,
    term: term || undefined,
    classId: classId || undefined,
    unitId: unitId || undefined,
    trainerId: trainerId || undefined,
    admissionNo: query.admission_no,
  })

  let deptName = ''
  if (deptId) {
    const { data: dept } = await db.from('departments').select('name').eq('id', deptId).maybeSingle()
    deptName = String((dept as Row)?.name ?? '')
  } else if (marks.length) {
    deptName = String(marks[0].dept_name ?? 'All Departments')
  }

  let className = ''
  let unitName = ''
  if (classId) {
    const { data: cls } = await db.from('classes').select('name').eq('id', classId).maybeSingle()
    className = String((cls as Row)?.name ?? '')
  }
  if (unitId) {
    const { data: unit } = await db.from('units').select('name, code').eq('id', unitId).maybeSingle()
    const u = unit as Row
    if (u) unitName = `${u.code ?? ''} — ${u.name ?? ''}`.trim()
  }

  const total = marks.length
  const passCount = marks.filter((m) => ['M', 'P', 'C'].includes(String(m.grade))).length
  const passRate = total ? Math.round((passCount / total) * 100) : 0
  const avgPct = total
    ? Math.round((marks.reduce((s, m) => s + Number(m.percentage ?? 0), 0) / total) * 10) / 10
    : 0

  return {
    marks,
    year,
    term,
    class_name: className,
    unit_name: unitName,
    dept_name: deptName,
    hod_name: String(user.full_name ?? 'Head of Department'),
    generated_at: nowGenerated(),
    total,
    pass_count: passCount,
    pass_rate: passRate,
    avg_pct: avgPct,
  }
}

export async function buildUnitAttendanceRegister(
  db: Db,
  opts: {
    classId: string
    unitId: string
    year: number
    term: number
    trainerId?: string | null
  },
) {
  const { classId, unitId, year, term, trainerId } = opts

  const [{ data: cls }, { data: unit }] = await Promise.all([
    db.from('classes').select('name, department_id').eq('id', classId).maybeSingle(),
    db.from('units').select('code, name').eq('id', unitId).maybeSingle(),
  ])

  let dept: Row = {}
  const deptId = (cls as Row)?.department_id
  if (deptId) {
    const { data } = await db.from('departments').select('name, code').eq('id', deptId).maybeSingle()
    dept = (data as Row) ?? {}
  }

  let trainerName = ''
  let cuQ = db
    .from('class_units')
    .select('trainer_id, user_profiles!class_units_trainer_id_fkey(full_name)')
    .eq('class_id', classId)
    .eq('unit_id', unitId)
  if (trainerId) cuQ = cuQ.eq('trainer_id', trainerId)
  const { data: cu } = await cuQ.limit(1)
  const cuRow = ((cu ?? []) as Row[])[0]
  if (cuRow) trainerName = String(((cuRow.user_profiles as Row) ?? {}).full_name ?? '')

  if (trainerId && !trainerName) {
    const { data: tp } = await db.from('user_profiles').select('full_name').eq('id', trainerId).limit(1)
    trainerName = String(((tp ?? []) as Row[])[0]?.full_name ?? '')
  }

  let attQ = db
    .from('attendance')
    .select(
      'student_id, week, lesson, status, attendance_date, trainer_id, ' +
        'user_profiles:student_id(full_name, admission_no)',
    )
    .eq('unit_id', unitId)
    .eq('year', year)
    .eq('term', term)
  if (trainerId) attQ = attQ.eq('trainer_id', trainerId)
  const { data: attRows } = await attQ
  const rows = (attRows ?? []) as unknown as Row[]
  if (!rows.length) return null

  type SessionKey = string
  const sessionTimes = new Map<SessionKey, Date[]>()
  const matrix = new Map<string, Map<SessionKey, string>>()
  const students = new Map<string, Row>()

  for (const r of rows) {
    if (r.week == null || !r.lesson) continue
    const key = `${Number(r.week)}|${normLesson(r.lesson)}`
    const sid = String(r.student_id ?? '')
    if (!sid) continue
    const st = String(r.status ?? '').toLowerCase()
    if (!matrix.has(sid)) matrix.set(sid, new Map())
    matrix.get(sid)!.set(key, st)
    const ts = parseTs(r.attendance_date)
    if (ts) {
      if (!sessionTimes.has(key)) sessionTimes.set(key, [])
      sessionTimes.get(key)!.push(ts)
    }
    if (!students.has(sid)) {
      const p = (r.user_profiles as Row) ?? {}
      students.set(sid, {
        id: sid,
        full_name: p.full_name ?? '—',
        admission_no: p.admission_no ?? '—',
      })
    }
  }

  const { data: enrolled } = await db
    .from('enrollments')
    .select('student_id, user_profiles(id, full_name, admission_no)')
    .eq('class_id', classId)
  for (const e of (enrolled ?? []) as Row[]) {
    const sid = String(e.student_id ?? '')
    if (!sid || students.has(sid)) continue
    const p = (e.user_profiles as Row) ?? {}
    students.set(sid, {
      id: sid,
      full_name: p.full_name ?? '—',
      admission_no: p.admission_no ?? '—',
    })
  }

  const sessionKeys =
    sessionTimes.size > 0
      ? [...sessionTimes.keys()].sort()
      : [
          ...new Set(
            rows
              .filter((r) => r.week != null && r.lesson)
              .map((r) => `${Number(r.week)}|${normLesson(r.lesson)}`),
          ),
        ].sort()

  const session_cols = sessionKeys.map((key) => {
    const [w, les] = key.split('|')
    const times = sessionTimes.get(key) ?? []
    const taken = times.length ? new Date(Math.min(...times.map((t) => t.getTime()))) : null
    const labels = fmtSessionTime(taken)
    return {
      week: Number(w),
      lesson: les,
      label: `W${w}-${les}`,
      date_label: labels.date_label,
      time_label: labels.time_label,
      taken_full: labels.full,
    }
  })

  const student_rows = [...students.entries()]
    .sort((a, b) => {
      const an = String(a[1].full_name ?? '').toLowerCase()
      const bn = String(b[1].full_name ?? '').toLowerCase()
      return an.localeCompare(bn) || String(a[1].admission_no).localeCompare(String(b[1].admission_no))
    })
    .map(([, stu]) => {
      const sid = String(stu.id)
      const cells: Row[] = []
      let present = 0
      let absent = 0
      for (const key of sessionKeys) {
        const st = matrix.get(sid)?.get(key) ?? ''
        let mark = '—'
        if (st === 'present') {
          present += 1
          mark = 'P'
        } else if (st === 'late') {
          present += 1
          mark = 'L'
        } else if (st === 'absent') {
          absent += 1
          mark = 'A'
        }
        cells.push({ status: st || 'none', mark })
      }
      const marked = cells.filter((c) => c.mark !== '—').length
      const rate = marked ? Math.round((present / marked) * 1000) / 10 : 0
      return { ...stu, cells, present, absent, marked, rate }
    })

  const unitCode = String((unit as Row)?.code ?? 'UNIT')
    .toUpperCase()
    .replace(/\s/g, '')
    .slice(0, 16)

  return {
    cls: cls ?? {},
    unit: unit ?? {},
    dept,
    year,
    term,
    session_cols,
    student_rows,
    trainer: { name: trainerName || '—' },
    generated: nowGenerated(),
    ref_code: `ATT/${unitCode}/T${term}/${year}`,
    session_count: session_cols.length,
    student_count: student_rows.length,
  }
}

export async function buildGraduationPrintPayload(
  db: Db,
  classId: string,
  year?: number,
  term?: number,
  eligibleOnly = false,
) {
  const { data: cls } = await db
    .from('classes')
    .select('id, name, course_id, department_id, departments(name), courses(name, code)')
    .eq('id', classId)
    .maybeSingle()
  if (!cls) throw new Error('Class not found.')

  const classRow = cls as Row
  const meta = {
    class_name: classRow.name ?? '',
    dept_name: ((classRow.departments as Row) ?? {}).name ?? '',
    course_name: ((classRow.courses as Row) ?? {}).name ?? '',
    course_code: ((classRow.courses as Row) ?? {}).code ?? '',
  }

  let units: Row[] = []
  if (classRow.course_id) {
    const { data } = await db
      .from('units')
      .select('id, code, name')
      .eq('course_id', classRow.course_id)
      .order('code')
    units = (data ?? []) as Row[]
  }

  const { data: enrollments } = await db
    .from('enrollments')
    .select('student_id, user_profiles(full_name, admission_no)')
    .eq('class_id', classId)

  let cq = db.from('summative_competences').select('student_id, unit_id, competence').eq('class_id', classId)
  if (year) cq = cq.eq('year', year)
  if (term) cq = cq.eq('term', term)
  const { data: competenceRows } = await cq

  const cmap = new Map<string, Map<string, string | null>>()
  for (const r of (competenceRows ?? []) as Row[]) {
    const sid = String(r.student_id)
    if (!cmap.has(sid)) cmap.set(sid, new Map())
    cmap.get(sid)!.set(String(r.unit_id), normalizeCompetence(r.competence))
  }

  const stats = { eligible: 0, not_eligible: 0, total: 0, pct_eligible: 0 }
  const rows: Row[] = []

  for (const enr of (enrollments ?? []) as Row[]) {
    const profile = (enr.user_profiles as Row) ?? {}
    const sid = String(enr.student_id ?? profile.id ?? '')
    const unitResults: Record<string, string | null> = {}
    let allMet = true
    for (const u of units) {
      const uid = String(u.id)
      const comp = cmap.get(sid)?.get(uid) ?? null
      unitResults[uid] = comp
      if (!comp || !PASSING.has(comp)) allMet = false
    }
    const eligible = allMet && units.length > 0
    if (eligible) stats.eligible += 1
    else stats.not_eligible += 1
    stats.total += 1
    rows.push({
      admission_no: profile.admission_no ?? '—',
      full_name: profile.full_name ?? '—',
      unit_results: unitResults,
      eligible,
    })
  }

  if (eligibleOnly) {
    const filtered = rows.filter((r) => r.eligible)
    return {
      meta,
      units,
      rows: filtered,
      stats: {
        ...stats,
        total: filtered.length,
        eligible: filtered.length,
        not_eligible: 0,
        pct_eligible: stats.total ? Math.round((stats.eligible / stats.total) * 1000) / 10 : 0,
      },
      year,
      term,
      period_label: [year ? `Year ${year}` : '', term ? `Term ${term}` : ''].filter(Boolean).join(' · ') || 'All Periods',
      eligible_only: eligibleOnly,
      generated: nowShort(),
    }
  }

  if (stats.total) stats.pct_eligible = Math.round((stats.eligible / stats.total) * 1000) / 10

  return {
    meta,
    units,
    rows,
    stats,
    year,
    term,
    period_label: [year ? `Year ${year}` : '', term ? `Term ${term}` : ''].filter(Boolean).join(' · ') || 'All Periods',
    eligible_only: eligibleOnly,
    generated: nowShort(),
  }
}

export async function buildClassListPrintPayload(db: Db, classId: string, deptName: string) {
  const { data: cls } = await db.from('classes').select('*, courses(name)').eq('id', classId).maybeSingle()
  const { data: enrollments } = await db
    .from('enrollments')
    .select('*, user_profiles(id, full_name, admission_no, email, mobile_number)')
    .eq('class_id', classId)

  const students = ((enrollments ?? []) as unknown as Row[])
    .map((e) => {
      const p = (e.user_profiles as Row) ?? {}
      return {
        ...p,
        admission_number: p.admission_no ?? '',
      } as Row
    })
    .filter((s) => s.full_name)

  return {
    cls: cls ?? {},
    dept_name: deptName,
    students,
    date_gen: nowShort(),
  }
}

export async function buildAssessmentSheetPrintPayload(
  db: Db,
  opts: { classId: string; unitId: string; year?: string; term?: string; minPct: number; deptName: string },
) {
  const { classId, unitId, year, term, minPct, deptName } = opts
  const [{ data: cls }, { data: unit }] = await Promise.all([
    db.from('classes').select('id, name').eq('id', classId).maybeSingle(),
    db.from('units').select('id, name, code').eq('id', unitId).maybeSingle(),
  ])

  const { data: enrollments } = await db
    .from('enrollments')
    .select('student_id, user_profiles!inner(id, full_name, admission_no)')
    .eq('class_id', classId)

  const eligible: Row[] = []
  for (const e of (enrollments ?? []) as Row[]) {
    const student = (e.user_profiles as Row) ?? {}
    const sid = String(student.id ?? '')
    if (!sid) continue
    let attQ = db.from('attendance').select('status').eq('student_id', sid).eq('unit_id', unitId)
    if (year) attQ = attQ.eq('year', parseInt(year, 10))
    if (term) attQ = attQ.eq('term', parseInt(term, 10))
    const { data: attRecords } = await attQ
    const total = (attRecords ?? []).length
    if (!total) continue
    const present = ((attRecords ?? []) as Row[]).filter((a) => a.status === 'present').length
    const pct = Math.round((present / total) * 1000) / 10
    if (pct >= minPct) {
      eligible.push({
        admission_number: student.admission_no ?? '',
        full_name: student.full_name ?? '',
        present,
        total,
        pct,
      })
    }
  }
  eligible.sort((a, b) => String(a.full_name).localeCompare(String(b.full_name)))

  return {
    cls: cls ?? {},
    unit: unit ?? {},
    dept_name: deptName,
    term_label: term ? `Term ${term}` : 'All Terms',
    year: year ?? '',
    min_pct: minPct,
    eligible,
    date_gen: nowShort(),
  }
}

export async function buildTraineeReportPrintPayload(
  db: Db,
  studentId: string,
  unitId: string,
  deptName: string,
) {
  const [{ data: student }, { data: records }] = await Promise.all([
    db.from('user_profiles').select('*').eq('id', studentId).maybeSingle(),
    db
      .from('attendance')
      .select('*, units(name, code), trainers:user_profiles!attendance_trainer_id_fkey(full_name)')
      .eq('student_id', studentId)
      .eq('unit_id', unitId)
      .order('attendance_date', { ascending: false }),
  ])

  const stu = (student as Row) ?? {}
  const recs = (records ?? []) as Row[]
  const { data: unitInfo } = await db.from('units').select('name, code').eq('id', unitId).maybeSingle()
  const total = recs.length
  const present = recs.filter((a) => a.status === 'present').length

  return {
    dept_name: deptName,
    student: {
      ...stu,
      admission_number: stu.admission_no ?? '',
    },
    records: recs,
    summary: {
      total,
      present,
      absent: total - present,
      pct: total ? Math.round((present / total) * 1000) / 10 : 0,
      unit_code: (unitInfo as Row)?.code ?? '',
      unit_name: (unitInfo as Row)?.name ?? '',
    },
    generated: nowShort(),
  }
}

export async function buildStudentUnitReportPrintPayload(db: Db, studentId: string, unitId: string) {
  const [{ data: unit }, { data: student }, { data: records }] = await Promise.all([
    db.from('units').select('*').eq('id', unitId).maybeSingle(),
    db.from('user_profiles').select('full_name, admission_no').eq('id', studentId).maybeSingle(),
    db
      .from('attendance')
      .select('*')
      .eq('student_id', studentId)
      .eq('unit_id', unitId)
      .order('attendance_date', { ascending: true }),
  ])

  const recs = (records ?? []) as Row[]
  const total = recs.length
  const present = recs.filter((r) => ['present', 'late'].includes(String(r.status ?? '').toLowerCase())).length
  const absent = recs.filter((r) => String(r.status ?? '').toLowerCase() === 'absent').length
  const pct = total ? Math.round((present / total) * 1000) / 10 : 0

  const info = { class_name: '', dept_name: '', dept_code: '' }
  const { data: enr } = await db
    .from('enrollments')
    .select('classes(name, departments(name, code))')
    .eq('student_id', studentId)
    .limit(1)
  const enrRow = ((enr ?? []) as Row[])[0]
  if (enrRow) {
    const cls = (enrRow.classes as Row) ?? {}
    const dept = (cls.departments as Row) ?? {}
    info.class_name = String(cls.name ?? '')
    info.dept_name = String(dept.name ?? '')
    info.dept_code = String(dept.code ?? '').trim()
  }

  const yearGen = new Date().getFullYear()
  const deptSlug = (info.dept_code || 'DEPT').toUpperCase().replace(/\s/g, '').slice(0, 8)
  const unitSlug = String((unit as Row)?.code ?? 'UNIT')
    .toUpperCase()
    .replace(/\s/g, '')
    .slice(0, 16)

  return {
    unit: unit ?? {},
    student: student ?? {},
    records: recs,
    attended: present,
    absent,
    total,
    pct,
    info,
    date_gen: nowGenerated().split(' at ')[0],
    year_gen: yearGen,
    ref_code: `ATT/${deptSlug}/${unitSlug}/${String(yearGen).slice(2)}`,
  }
}

export async function buildTraineeApprovedBookingsPayload(db: Db, studentId: string, deptName: string) {
  const [{ data: student }, { data: bookings }] = await Promise.all([
    db.from('user_profiles').select('full_name, admission_no, mobile_number').eq('id', studentId).maybeSingle(),
    db
      .from('exam_bookings')
      .select('*, units(name, code)')
      .eq('student_id', studentId)
      .eq('status', 'approved')
      .order('exam_date'),
  ])

  const { data: enr } = await db
    .from('enrollments')
    .select('classes(name)')
    .eq('student_id', studentId)
    .limit(1)
  const enrClasses = ((enr ?? []) as Row[])[0]?.classes as Row | undefined
  const className = String(enrClasses?.name ?? '')

  return {
    student: student ?? {},
    class_name: className,
    dept_name: deptName,
    bookings: bookings ?? [],
    date_gen: nowGenerated().split(' at ')[0],
  }
}

export async function buildTrainerMarksPrintPayload(
  db: Db,
  trainerId: string,
  classId: string,
  unitId: string,
  year: number,
  term: number,
) {
  const [{ data: cls }, { data: unit }, { data: dept }, { data: rawStudents }] = await Promise.all([
    db.from('classes').select('name').eq('id', classId).maybeSingle(),
    db.from('units').select('code, name').eq('id', unitId).maybeSingle(),
    db.from('user_profiles').select('full_name, department_id').eq('id', trainerId).maybeSingle(),
    db.from('enrollments').select('student_id, user_profiles(full_name, admission_no)').eq('class_id', classId),
  ])

  let deptName = ''
  const deptId = (dept as Row)?.department_id
  if (deptId) {
    const { data: d } = await db.from('departments').select('name').eq('id', deptId).maybeSingle()
    deptName = String((d as Row)?.name ?? '')
  }

  const students = ((rawStudents ?? []) as Row[]).sort((a, b) =>
    String((a.user_profiles as Row)?.full_name ?? '').localeCompare(
      String((b.user_profiles as Row)?.full_name ?? ''),
    ),
  )

  const { data: assessments } = await db
    .from('formative_assessments')
    .select('*')
    .eq('unit_id', unitId)
    .eq('class_id', classId)
    .eq('trainer_id', trainerId)
    .eq('year', year)
    .eq('term', term)
    .order('assessment_type')
    .order('created_at')

  const assessList = (assessments ?? []) as Row[]
  const aIds = assessList.map((a) => a.id)
  const marksMap = new Map<string, Map<string, number>>()
  if (aIds.length) {
    const { data: fm } = await db
      .from('formative_marks')
      .select('assessment_id, student_id, marks_obtained')
      .in('assessment_id', aIds)
    for (const m of (fm ?? []) as Row[]) {
      const sid = String(m.student_id)
      if (!marksMap.has(sid)) marksMap.set(sid, new Map())
      marksMap.get(sid)!.set(String(m.assessment_id), Number(m.marks_obtained))
    }
  }

  const rows = students.map((s, idx) => {
    const sid = String(s.student_id)
    const profile = (s.user_profiles as Row) ?? {}
    let totalObt = 0
    let totalMax = 0
    const cells = assessList.map((a) => {
      const obt = marksMap.get(sid)?.get(String(a.id))
      const max = parseFloat(String(a.max_marks ?? 100)) || 100
      if (obt !== undefined && obt !== null) {
        totalObt += obt
        totalMax += max
      }
      return { assessment_id: a.id, marks: obt ?? null, max }
    })
    const avgPct = totalMax ? Math.round((totalObt / totalMax) * 1000) / 10 : null
    const grade = avgPct !== null ? computeGrade(totalObt, totalMax).grade : '—'
    return {
      num: idx + 1,
      admission_no: profile.admission_no ?? '—',
      full_name: profile.full_name ?? '—',
      cells,
      total: totalMax ? `${totalObt}/${totalMax}` : '—',
      avg_pct: avgPct,
      grade,
    }
  })

  return {
    cls: cls ?? {},
    unit: unit ?? {},
    dept_name: deptName,
    trainer_name: String((dept as Row)?.full_name ?? ''),
    year,
    term,
    assessments: assessList,
    rows,
    generated: nowGenerated(),
  }
}

export async function buildClearanceFormPayload(db: Db, requestId: string) {
  const { data: cr } = await db
    .from('clearance_requests')
    .select(
      '*, courses(name, code), departments(name), ' +
        'user_profiles:user_profiles!clearance_requests_student_id_fkey(full_name, admission_no, email, mobile_number, national_id)',
    )
    .eq('id', requestId)
    .maybeSingle()
  if (!cr) throw new Error('Clearance request not found.')
  const row = cr as unknown as Row
  return {
    clearance_request: row,
    student: row.user_profiles ?? {},
  }
}
