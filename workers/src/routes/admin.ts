/**
 * Super Admin and Department Admin dashboards.
 *
 * Ports routes/super_admin.py::dashboard (L225-405) and
 * routes/dept_admin.py::dashboard (L234-448) — same counts, same joins,
 * same chart series, returned as JSON for the React portals.
 */
import { Hono } from 'hono'
import { getServiceClient } from '../lib/supabase'
import { ok, err } from '../lib/responses'
import { requireRole } from '../middleware/auth'
import { countTable, countStatusMap, clearanceKpi, attachmentStatusCounts, tally } from '../lib/stats'
import { daysAgoEAT } from '../lib/dates'
import type { Env, AppVariables } from '../types'

const admin = new Hono<{ Bindings: Env; Variables: AppVariables }>()

type Row = Record<string, unknown>

const KNOWN_ROLES = [
  'super_admin',
  'dept_admin',
  'trainer',
  'student',
  'workshop_technician',
  'examination_officer',
  'registrar',
  'deputy_principal',
  'quality_assurance_officer',
  'liaison_officer',
  'cdacc_verifier',
  'library_hod',
  'sports_hod',
  'service_clearance_officer',
] as const

/** Last 7 days as MM-DD labels plus the full ISO dates (oldest first). */
function last7Days() {
  const days: Array<{ iso: string; label: string }> = []
  for (let i = 6; i >= 0; i -= 1) {
    const iso = daysAgoEAT(i)
    days.push({ iso, label: iso.slice(5) })
  }
  return days
}

/* ── Super Admin ─────────────────────────────────────────────────────────── */

admin.get('/super-admin/dashboard', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)

  const [
    departments,
    classes,
    units,
    attendance,
    assessments,
    users,
    deptAdmins,
    trainers,
    students,
    pending,
    approved,
    rejected,
    cl,
    tripsTotal,
    tripsPending,
    summativeNyc,
    summativeTotal,
  ] = await Promise.all([
    countTable(db, 'departments'),
    countTable(db, 'classes'),
    countTable(db, 'units'),
    countTable(db, 'attendance'),
    countTable(db, 'assessments'),
    countTable(db, 'user_profiles'),
    countTable(db, 'user_profiles', { role: 'dept_admin' }),
    countTable(db, 'user_profiles', { role: 'trainer' }),
    countTable(db, 'user_profiles', { role: 'student' }),
    countTable(db, 'assessments', { status: 'pending' }),
    countTable(db, 'assessments', { status: 'approved' }),
    countTable(db, 'assessments', { status: 'rejected' }),
    clearanceKpi(db),
    countTable(db, 'academic_trips'),
    countTable(db, 'academic_trips', { status: 'submitted' }),
    countTable(db, 'summative_competences', { competence: 'not_yet_competent' }),
    countTable(db, 'summative_competences'),
  ])

  const stats = {
    departments,
    classes,
    units,
    attendance,
    assessments,
    users,
    dept_admins: deptAdmins,
    trainers,
    students,
    pending,
    approved,
    rejected,
    clearances: cl.total,
    clearances_pending: cl.pending,
    clearances_completed: cl.completed,
    clearances_returned: cl.returned,
    trips_total: tripsTotal,
    trips_pending: tripsPending,
    summative_nyc: summativeNyc,
    summative_total: summativeTotal,
  }

  const [recentAssessments, recentClearances, deptRows, recentLogs, typedRows, iaStats, caStats] =
    await Promise.all([
      db
        .from('assessments')
        .select(
          '*, user_profiles!assessments_student_id_fkey(full_name, admission_no), units(name), classes(name)',
        )
        .order('uploaded_at', { ascending: false })
        .limit(8),
      db
        .from('clearance_requests')
        .select(
          '*, user_profiles!clearance_requests_student_id_fkey(full_name, admission_no), courses(name)',
        )
        .order('created_at', { ascending: false })
        .limit(5),
      db.from('departments').select('id, name').order('name'),
      db
        .from('system_logs')
        .select('*, user_profiles(full_name, role)')
        .order('created_at', { ascending: false })
        .limit(10),
      db.from('assessments').select('assessment_type').limit(5000),
      countStatusMap(db, 'industrial_attachments', [
        'pending',
        'approved',
        'active',
        'completed',
        'rejected',
        'terminated',
      ]),
      countStatusMap(db, 'course_applications', ['pending', 'approved', 'rejected']),
    ])

  // Per-department breakdown (counts are exact, like the Flask loop).
  const deptStats = await Promise.all(
    (deptRows.data ?? []).map(async (d) => {
      const did = (d as Row).id as string
      const [class_count, student_count, trainer_count, unit_count] = await Promise.all([
        countTable(db, 'classes', { department_id: did }),
        countTable(db, 'user_profiles', { department_id: did, role: 'student' }),
        countTable(db, 'user_profiles', { department_id: did, role: 'trainer' }),
        countTable(db, 'units', { department_id: did }),
      ])
      return { id: did, name: (d as Row).name as string, class_count, student_count, trainer_count, unit_count }
    }),
  )

  // 7-day attendance trend.
  const days = last7Days()
  const trend = await Promise.all(
    days.map(async ({ iso, label }) => {
      const [present, total] = await Promise.all([
        countTable(db, 'attendance', { attendance_date: iso, status: 'present' }),
        countTable(db, 'attendance', { attendance_date: iso }),
      ])
      return { label, present, absent: Math.max(0, total - present) }
    }),
  )

  // Exact per-role counts, with an "other" bucket like the Flask view.
  const roleEntries = await Promise.all(
    KNOWN_ROLES.map(async (role) => [role, await countTable(db, 'user_profiles', { role })] as const),
  )
  const roleMap: Record<string, number> = {}
  let counted = 0
  for (const [role, n] of roleEntries) {
    if (n) roleMap[role] = n
    counted += n
  }
  if (stats.users - counted > 0) roleMap.other = stats.users - counted

  const atype = tally((typedRows.data ?? []) as Row[], 'assessment_type')

  return ok(c, {
    stats,
    ia_stats: iaStats,
    ca_stats: caStats,
    role_map: roleMap,
    trend_labels: trend.map((t) => t.label),
    trend_present: trend.map((t) => t.present),
    trend_absent: trend.map((t) => t.absent),
    atype_labels: atype.labels,
    atype_counts: atype.counts,
    dept_chart_labels: deptStats.map((d) => d.name),
    dept_chart_students: deptStats.map((d) => d.student_count),
    dept_chart_trainers: deptStats.map((d) => d.trainer_count),
    dept_chart_classes: deptStats.map((d) => d.class_count),
    dept_stats: deptStats,
    recent_assessments: recentAssessments.data ?? [],
    recent_clearances: recentClearances.data ?? [],
    recent_logs: recentLogs.data ?? [],
  })
})

/* ── Department Admin ────────────────────────────────────────────────────── */

admin.get('/dept-admin/dashboard', requireRole('dept_admin'), async (c) => {
  const user = c.get('user')
  const deptId = user.department_id
  if (!deptId) return err(c, 'No department assigned to this account.', 400, 'no_department')

  const db = getServiceClient(c.env)

  const { data: dept } = await db.from('departments').select('*').eq('id', deptId).maybeSingle()

  const [
    classes,
    trainers,
    students,
    unitsCount,
    applications,
    pendingApplications,
    tripsTotal,
    tripsPending,
    summativeNyc,
  ] = await Promise.all([
    countTable(db, 'classes', { department_id: deptId }),
    countTable(db, 'user_profiles', { role: 'trainer', department_id: deptId }),
    countTable(db, 'user_profiles', { role: 'student', department_id: deptId }),
    countTable(db, 'units', { department_id: deptId }),
    countTable(db, 'course_applications', { department_id: deptId }),
    countTable(db, 'course_applications', { department_id: deptId, status: 'pending' }),
    countTable(db, 'academic_trips', { department_id: deptId }),
    countTable(db, 'academic_trips', { department_id: deptId, status: 'submitted' }),
    countTable(db, 'summative_competences', {
      department_id: deptId,
      competence: 'not_yet_competent',
    }),
  ])

  /** Assessments are scoped through units!inner(department_id), as in Flask. */
  async function assessmentCount(status?: string) {
    let q = db
      .from('assessments')
      .select('id, units!inner(department_id)', { count: 'exact', head: true })
      .eq('units.department_id', deptId)
    if (status) q = q.eq('status', status)
    return q.then(
      (r) => r.count ?? 0,
      () => 0,
    )
  }

  const [assessments, pending, approved, rejected] = await Promise.all([
    assessmentCount(),
    assessmentCount('pending'),
    assessmentCount('approved'),
    assessmentCount('rejected'),
  ])

  const stats = {
    classes,
    trainers,
    students,
    units: unitsCount,
    assessments,
    pending,
    approved,
    rejected,
    applications,
    pending_applications: pendingApplications,
    trips_total: tripsTotal,
    trips_pending: tripsPending,
    summative_nyc: summativeNyc,
  }

  const [
    notifications,
    recentAssessments,
    recentAttendanceRes,
    unitsList,
    allAttendance,
    appStatus,
    cl,
    deptStudentIds,
    classesData,
    typedAssessments,
  ] = await Promise.all([
    db
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(3),
    db
      .from('assessments')
      .select(
        '*, user_profiles!assessments_student_id_fkey(full_name, admission_no), units!inner(name, department_id), classes(name)',
      )
      .eq('units.department_id', deptId)
      .order('uploaded_at', { ascending: false })
      .limit(8),
    db
      .from('attendance')
      .select(
        '*, user_profiles!attendance_student_id_fkey(full_name, admission_no, enrollments(classes(name))), units!inner(name, code, department_id)',
      )
      .eq('units.department_id', deptId)
      .order('attendance_date', { ascending: false })
      .limit(10),
    db.from('units').select('id, name, code').eq('department_id', deptId).order('name'),
    db.from('attendance').select('status, units!inner(name, department_id)').eq('units.department_id', deptId),
    countStatusMap(db, 'course_applications', ['pending', 'approved', 'rejected'], {
      department_id: deptId,
    }),
    clearanceKpi(db, deptId),
    db.from('user_profiles').select('id').eq('role', 'student').eq('department_id', deptId),
    db.from('classes').select('id, name, courses(name)').eq('department_id', deptId).order('name'),
    db
      .from('assessments')
      .select('assessment_type, units!inner(department_id)')
      .eq('units.department_id', deptId),
  ])

  // Flatten the nested enrollment→class name, matching the Flask post-processing.
  const recentAttendance = (recentAttendanceRes.data ?? []).map((att) => {
    const row = att as Row
    const student = (row.user_profiles as Row) || {}
    const enrolls = (student.enrollments as Row[]) || []
    row.classes = (enrolls[0]?.classes as Row) || {}
    return row
  })

  // Attendance present/absent per unit.
  const perUnit = new Map<string, { present: number; absent: number }>()
  for (const row of (allAttendance.data ?? []) as Row[]) {
    const name = ((row.units as Row)?.name as string) || 'Unknown'
    const bucket = perUnit.get(name) ?? { present: 0, absent: 0 }
    if (row.status === 'present') bucket.present += 1
    else bucket.absent += 1
    perUnit.set(name, bucket)
  }

  const days = last7Days()
  const trend = await Promise.all(
    days.map(async ({ iso, label }) => {
      const { data } = await db
        .from('attendance')
        .select('status, units!inner(department_id)')
        .eq('units.department_id', deptId)
        .eq('attendance_date', iso)
      const rows = (data ?? []) as Row[]
      const present = rows.filter((r) => r.status === 'present').length
      return { label, present, absent: rows.length - present }
    }),
  )

  const attachmentStats = await attachmentStatusCounts(
    db,
    ((deptStudentIds.data ?? []) as Row[]).map((u) => u.id as string),
  )

  const classRows = ((classesData.data ?? []) as Row[]).slice(0, 10)
  const classCounts = await Promise.all(
    classRows.map((cls) => countTable(db, 'enrollments', { class_id: cls.id as string })),
  )

  const atype = tally((typedAssessments.data ?? []) as Row[], 'assessment_type')

  return ok(c, {
    department_name: (dept as Row | null)?.name ?? '',
    dept: dept ?? {},
    stats,
    app_status: appStatus,
    clearance_stats: { pending: cl.pending, approved: cl.completed, rejected: cl.rejected },
    attachment_stats: attachmentStats,
    att_unit_labels: [...perUnit.keys()],
    att_unit_present: [...perUnit.values()].map((v) => v.present),
    att_unit_absent: [...perUnit.values()].map((v) => v.absent),
    trend_labels: trend.map((t) => t.label),
    trend_present: trend.map((t) => t.present),
    trend_absent: trend.map((t) => t.absent),
    class_labels: classRows.map((c2) => c2.name as string),
    class_counts: classCounts,
    atype_labels: atype.labels,
    atype_counts: atype.counts,
    unread_notifications: notifications.data ?? [],
    recent_assessments: recentAssessments.data ?? [],
    recent_attendance: recentAttendance,
    units_list: unitsList.data ?? [],
  })
})

export default admin
