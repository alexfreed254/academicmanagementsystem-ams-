/**
 * Specialist role dashboards — direct ports of the Flask blueprints:
 *   routes/examination_officer.py   routes/industry_mentor.py
 *   routes/internal_verifier.py     routes/liaison_officer.py
 *   routes/cdacc_verifier.py        routes/workshop_technician.py
 *   routes/service_dept.py          routes/admin_oversight.py
 */
import { Hono } from 'hono'
import { getServiceClient } from '../lib/supabase'
import { ok, err } from '../lib/responses'
import { requireRole } from '../middleware/auth'
import { countTable, clearanceKpi } from '../lib/stats'
import { currentMonthLabelEAT } from '../lib/dates'
import type { Env, AppVariables } from '../types'

const roles = new Hono<{ Bindings: Env; Variables: AppVariables }>()

type Row = Record<string, unknown>

/* ── Examination Officer ─────────────────────────────────────────────────── */

roles.get('/examination-officer/dashboard', requireRole('examination_officer'), async (c) => {
  const db = getServiceClient(c.env)

  const [totalApproved, totalPending, totalCompleted, bookings] = await Promise.all([
    countTable(db, 'exam_bookings', { status: 'approved' }),
    countTable(db, 'exam_bookings', { status: 'pending' }),
    countTable(db, 'exam_bookings', { status: 'completed' }),
    db
      .from('exam_bookings')
      .select(
        '*, units(name, code), student:user_profiles!exam_bookings_student_id_fkey(full_name, admission_no, enrollments(classes(name, departments(name)))), approver:user_profiles!exam_bookings_approved_by_fkey(full_name)',
      )
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(10),
  ])

  // Flatten the student's first enrollment into `user_profiles.classes`.
  const recentBookings = ((bookings.data ?? []) as Row[]).map((booking) => {
    const student = (booking.student as Row) || {}
    const enrollments = (student.enrollments as Row[]) || []
    const cls = (enrollments[0]?.classes as Row) || {}
    student.classes = { name: cls.name ?? null, departments: cls.departments ?? {} }
    booking.user_profiles = student
    booking.approved_by_user = booking.approver ?? {}
    return booking
  })

  return ok(c, {
    total_approved: totalApproved,
    total_pending: totalPending,
    total_completed: totalCompleted,
    recent_bookings: recentBookings,
  })
})

/* ── Industry Mentor ─────────────────────────────────────────────────────── */

roles.get('/industry-mentor/dashboard', requireRole('industry_mentor'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)

  const { data: mentor } = await db
    .from('mentors')
    .select('*, companies(name, address)')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!mentor) {
    return err(c, 'Mentor profile not found. Please contact administrator.', 404, 'no_mentor')
  }
  const companyId = (mentor as Row).company_id as string

  const [attachments, pendingLogbooks, pendingCompetencies] = await Promise.all([
    db
      .from('industrial_attachments')
      .select('*, user_profiles(full_name, admission_no), units(name, code), companies(name)')
      .eq('company_id', companyId)
      .eq('status', 'active'),
    db
      .from('digital_logbook')
      .select('*, user_profiles(full_name, admission_no)')
      .eq('mentor_approval_status', 'pending'),
    db
      .from('competency_tracking')
      .select('*, user_profiles(full_name, admission_no), units(name, code)')
      .eq('verification_status', 'pending'),
  ])

  /**
   * Flask filters logbooks/competencies to this mentor's company one row at a
   * time; a single batched lookup of the referenced attachments is equivalent.
   */
  const attachmentIds = new Set<string>()
  for (const row of [...(pendingLogbooks.data ?? []), ...(pendingCompetencies.data ?? [])] as Row[]) {
    if (row.attachment_id) attachmentIds.add(row.attachment_id as string)
  }
  const companyByAttachment = new Map<string, string>()
  if (attachmentIds.size > 0) {
    const { data } = await db
      .from('industrial_attachments')
      .select('id, company_id')
      .in('id', [...attachmentIds])
    for (const row of (data ?? []) as Row[]) {
      companyByAttachment.set(row.id as string, row.company_id as string)
    }
  }
  const belongsToCompany = (row: Row) =>
    companyByAttachment.get(row.attachment_id as string) === companyId

  return ok(c, {
    mentor,
    attachments: attachments.data ?? [],
    pending_logbooks: ((pendingLogbooks.data ?? []) as Row[]).filter(belongsToCompany),
    pending_competencies: ((pendingCompetencies.data ?? []) as Row[]).filter(belongsToCompany),
  })
})

/* ── Internal Verifier ───────────────────────────────────────────────────── */

roles.get('/internal-verifier/dashboard', requireRole('internal_verifier'), async (c) => {
  const db = getServiceClient(c.env)

  const [pendingRes, verifiedCount, rejectedCount] = await Promise.all([
    db
      .from('competency_tracking')
      .select(
        '*, user_profiles(full_name, admission_no), units(name, code), assessor:user_profiles!competency_tracking_assessed_by_fkey(full_name)',
      )
      .eq('verification_status', 'pending')
      .order('assessment_date', { ascending: false }),
    countTable(db, 'competency_tracking', { verification_status: 'verified' }),
    countTable(db, 'competency_tracking', { verification_status: 'rejected' }),
  ])

  // The template reads `comp.assessor_name`, so flatten the joined assessor.
  const pendingCompetencies = ((pendingRes.data ?? []) as Row[]).map((row) => ({
    ...row,
    assessor_name: ((row.assessor as Row)?.full_name as string) ?? '',
  }))

  return ok(c, {
    pending_competencies: pendingCompetencies,
    total_pending: pendingCompetencies.length,
    verified_count: verifiedCount,
    rejected_count: rejectedCount,
  })
})

/* ── Liaison Officer ─────────────────────────────────────────────────────── */

roles.get('/liaison-officer/dashboard', requireRole('liaison_officer'), async (c) => {
  const db = getServiceClient(c.env)

  const [total, pending, active, approved, companies, pendingAttachments, activeAttachments, recentLogbooks] =
    await Promise.all([
      countTable(db, 'industrial_attachments'),
      countTable(db, 'industrial_attachments', { status: 'pending' }),
      countTable(db, 'industrial_attachments', { status: 'active' }),
      countTable(db, 'industrial_attachments', { status: 'approved' }),
      countTable(db, 'companies'),
      db
        .from('industrial_attachments')
        .select(
          '*, user_profiles!industrial_attachments_student_id_fkey(full_name, admission_no, departments(name)), companies(name, address)',
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(15),
      db
        .from('industrial_attachments')
        .select(
          '*, user_profiles!industrial_attachments_student_id_fkey(full_name, admission_no), companies(name, address)',
        )
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(10),
      db
        .from('digital_logbook')
        .select(
          '*, user_profiles!digital_logbook_student_id_fkey(full_name, admission_no), industrial_attachments!digital_logbook_attachment_id_fkey(companies(name))',
        )
        .order('log_date', { ascending: false })
        .limit(8),
    ])

  return ok(c, {
    stats: { total, pending, active, approved, companies },
    pending_attachments: pendingAttachments.data ?? [],
    active_attachments: activeAttachments.data ?? [],
    recent_logbooks: recentLogbooks.data ?? [],
    current_month: currentMonthLabelEAT(),
  })
})

/* ── CDACC External Verifier ─────────────────────────────────────────────── */

roles.get('/cdacc-verifier/dashboard', requireRole('cdacc_verifier'), async (c) => {
  const db = getServiceClient(c.env)

  const [total, pending, approved, rejected, pendingAssessments, recentVerified] = await Promise.all([
    countTable(db, 'assessments'),
    countTable(db, 'assessments', { status: 'pending' }),
    countTable(db, 'assessments', { status: 'approved' }),
    countTable(db, 'assessments', { status: 'rejected' }),
    db
      .from('assessments')
      .select(
        '*, user_profiles!assessments_student_id_fkey(full_name, admission_no, departments(name)), units(name, code), classes(name)',
      )
      .eq('status', 'pending')
      .order('uploaded_at', { ascending: false })
      .limit(15),
    db
      .from('assessments')
      .select('*, user_profiles!assessments_student_id_fkey(full_name, admission_no), units(name, code)')
      .in('status', ['approved', 'rejected'])
      .order('uploaded_at', { ascending: false })
      .limit(10),
  ])

  return ok(c, {
    stats: { total, pending, approved, rejected },
    pending_assessments: pendingAssessments.data ?? [],
    recent_verified: recentVerified.data ?? [],
    current_month: currentMonthLabelEAT(),
  })
})

/* ── Workshop Technician ─────────────────────────────────────────────────── */

roles.get('/workshop-technician/dashboard', requireRole('workshop_technician'), async (c) => {
  const user = c.get('user')
  const deptId = user.department_id
  const db = getServiceClient(c.env)

  let invTotal = 0
  let invLow = 0
  let invDamaged = 0
  let recentItems: Row[] = []
  let deptName: string | null = null

  if (deptId) {
    const [invRows, recent, dept, total] = await Promise.all([
      db.from('workshop_inventory').select('id, condition, quantity').eq('department_id', deptId),
      db
        .from('workshop_inventory')
        .select('id, item_name, category, quantity, condition, serial_number, created_at')
        .eq('department_id', deptId)
        .order('created_at', { ascending: false })
        .limit(6),
      db.from('departments').select('name').eq('id', deptId).maybeSingle(),
      countTable(db, 'workshop_inventory', { department_id: deptId }),
    ])

    const rows = (invRows.data ?? []) as Row[]
    invTotal = total
    invLow = rows.filter((i) => ((i.quantity as number) ?? 0) < 3).length
    invDamaged = rows.filter((i) => i.condition === 'poor' || i.condition === 'damaged').length
    recentItems = (recent.data ?? []) as Row[]
    deptName = ((dept.data as Row | null)?.name as string) ?? null
  }

  // Pending = approvals assigned to this technician + claimable unassigned tech slots.
  const assignedPending = await countTable(db, 'clearance_approvals', {
    approver_id: user.id,
    status: 'pending',
  })

  const { data: nullRows } = await db
    .from('clearance_approvals')
    .select('id, approver_category, clearance_requests!inner(status, department_id)')
    .is('approver_id', null)
    .eq('status', 'pending')
    .in('approver_category', ['tech_1', 'tech_2'])

  let unassigned = 0
  for (const row of (nullRows ?? []) as Row[]) {
    const req = (row.clearance_requests as Row) || {}
    const status = req.status as string
    if (status === 'completed' || status === 'rejected' || status === 'returned') continue
    if (deptId && req.department_id && req.department_id !== deptId) continue
    unassigned += 1
  }

  return ok(c, {
    inv_total: invTotal,
    inv_low: invLow,
    inv_damaged: invDamaged,
    pending_clearances: assignedPending + unassigned,
    recent_items: recentItems,
    dept_name: deptName,
  })
})

/* ── Service Departments (library / games / service clearance) ───────────── */

const DEPT_CONFIG: Record<
  string,
  { label: string; role_lbl: string; icon: string; gradient: string; accent: string; light: string; cats: string[]; approver_roles: string[] }
> = {
  library_hod: {
    label: 'Institute Library',
    role_lbl: 'Library Officer',
    icon: 'fa-book',
    gradient: 'linear-gradient(160deg, #1e3a8a 0%, #1d4ed8 100%)',
    accent: '#1d4ed8',
    light: '#dbeafe',
    cats: ['svc_library'],
    approver_roles: ['library_hod'],
  },
  sports_hod: {
    label: 'Games Department',
    role_lbl: 'Games Officer',
    icon: 'fa-futbol',
    gradient: 'linear-gradient(160deg, #14532d 0%, #16a34a 100%)',
    accent: '#16a34a',
    light: '#dcfce7',
    cats: ['svc_games'],
    approver_roles: ['sports_hod'],
  },
  service_clearance_officer: {
    label: 'Service Clearance',
    role_lbl: 'Service Clearance Officer',
    icon: 'fa-clipboard-check',
    gradient: 'linear-gradient(160deg, #78350f 0%, #d97706 100%)',
    accent: '#d97706',
    light: '#fef3c7',
    cats: ['svc_library', 'svc_ict', 'svc_games', 'svc_kitchen', 'svc_store'],
    approver_roles: ['library_hod', 'sports_hod'],
  },
}

const CATEGORY_LABELS: Record<string, string> = {
  svc_library: 'Institute Library',
  svc_ict: 'ICT Department',
  svc_games: 'Games Department',
  svc_kitchen: 'Kitchen / Cafeteria',
  svc_store: 'Store Department',
}

const APPROVAL_SEL =
  'id, clearance_stage_id, clearance_request_id, approver_id, approver_category, status, comments, approved_at, created_at, is_waived'

roles.get(
  '/service-dept/dashboard',
  requireRole('library_hod', 'sports_hod', 'service_clearance_officer'),
  async (c) => {
    const user = c.get('user')
    const config = DEPT_CONFIG[user.role]
    if (!config) return err(c, 'Access denied.', 403, 'forbidden')

    const db = getServiceClient(c.env)

    // Primary: by approver_category. Fallback: by stage for rows with a null category.
    const [primaryRes, stageRes] = await Promise.all([
      db
        .from('clearance_approvals')
        .select(APPROVAL_SEL)
        .in('approver_category', config.cats)
        .order('created_at', { ascending: false }),
      db
        .from('clearance_stages')
        .select('id, stage_name, approver_role')
        .in('approver_role', config.approver_roles),
    ])

    const stageRows = (stageRes.data ?? []) as Row[]
    const stageMeta = new Map(stageRows.map((s) => [s.id as string, s]))

    let fallback: Row[] = []
    if (stageRows.length > 0) {
      const { data } = await db
        .from('clearance_approvals')
        .select(APPROVAL_SEL)
        .in('clearance_stage_id', [...stageMeta.keys()])
        .is('approver_category', null)
        .order('created_at', { ascending: false })
      fallback = (data ?? []) as Row[]
    }

    const seen = new Set<string>()
    const allApprovals: Row[] = []
    for (const row of [...((primaryRes.data ?? []) as Row[]), ...fallback]) {
      const id = row.id as string
      if (seen.has(id)) continue
      seen.add(id)
      allApprovals.push(row)
    }

    const reqIds = [
      ...new Set(allApprovals.map((r) => r.clearance_request_id as string).filter(Boolean)),
    ]
    const reqMap = new Map<string, Row>()
    if (reqIds.length > 0) {
      const { data } = await db
        .from('clearance_requests')
        .select('id, student_id, status, stage, created_at, department_id, course_id, courses(name, code)')
        .in('id', reqIds)
      for (const r of (data ?? []) as Row[]) reqMap.set(r.id as string, r)
    }

    const studentIds = [
      ...new Set([...reqMap.values()].map((r) => r.student_id as string).filter(Boolean)),
    ]
    const studentMap = new Map<string, Row>()
    if (studentIds.length > 0) {
      const { data } = await db
        .from('user_profiles')
        .select('id, full_name, admission_no, mobile_number, department_id')
        .in('id', studentIds)
      for (const s of (data ?? []) as Row[]) studentMap.set(s.id as string, s)
    }

    const deptIds = new Set<string>()
    for (const r of reqMap.values()) if (r.department_id) deptIds.add(r.department_id as string)
    for (const s of studentMap.values()) if (s.department_id) deptIds.add(s.department_id as string)
    const deptMap = new Map<string, string>()
    if (deptIds.size > 0) {
      const { data } = await db.from('departments').select('id, name').in('id', [...deptIds])
      for (const d of (data ?? []) as Row[]) deptMap.set(d.id as string, d.name as string)
    }

    const approverIds = [...new Set(allApprovals.map((r) => r.approver_id as string).filter(Boolean))]
    const approverMap = new Map<string, Row>()
    if (approverIds.length > 0) {
      const { data } = await db.from('user_profiles').select('id, full_name, role').in('id', approverIds)
      for (const a of (data ?? []) as Row[]) approverMap.set(a.id as string, a)
    }

    const lostMap = new Map<string, Row[]>()
    if (allApprovals.length > 0) {
      const { data } = await db
        .from('clearance_lost_items')
        .select('id, clearance_approval_id, item_name, quantity, notes, created_at')
        .in(
          'clearance_approval_id',
          allApprovals.map((r) => r.id as string),
        )
        .order('created_at')
      for (const li of (data ?? []) as Row[]) {
        const key = li.clearance_approval_id as string
        lostMap.set(key, [...(lostMap.get(key) ?? []), li])
      }
    }

    const rows: Row[] = allApprovals.map((row) => {
      const req = reqMap.get((row.clearance_request_id as string) ?? '') ?? {}
      const sp = studentMap.get((req.student_id as string) ?? '') ?? {}
      const did = (sp.department_id as string) || (req.department_id as string)
      const stg = stageMeta.get((row.clearance_stage_id as string) ?? '') ?? {}
      return {
        ...row,
        _student: sp,
        _dept: did ? { name: deptMap.get(did) ?? '—' } : {},
        _course: req.courses ?? {},
        _req_status: req.status ?? '',
        _stage_name: stg.stage_name ?? '',
        _cat_label: CATEGORY_LABELS[(row.approver_category as string) ?? ''] ?? '',
        _lost_items: lostMap.get(row.id as string) ?? [],
        _approver: approverMap.get((row.approver_id as string) ?? '') ?? {},
      }
    })

    return ok(c, {
      config,
      pending: rows.filter(
        (r) => r.status === 'pending' && r._req_status !== 'completed' && r._req_status !== 'rejected',
      ),
      cleared: rows.filter((r) => r.status === 'approved'),
      rejected: rows.filter((r) => r.status === 'rejected'),
    })
  },
)

/* ── Admin oversight (registrar / deputy principal / QA officer) ─────────── */

const CLEARANCE_SEL =
  '*, departments(name), courses(name), user_profiles:user_profiles!clearance_requests_student_id_fkey(full_name, admission_no)'

async function oversightPayload(
  db: ReturnType<typeof getServiceClient>,
  departmentFilter: string,
  opts: { includeTrainers?: boolean; includeCerts?: boolean; includeAdmissions?: boolean; includeAssessments?: boolean },
) {
  const deptFilter = departmentFilter || undefined

  const [totalStudents, totalCourses, cl, pendingAdmissionsCount, departments] = await Promise.all([
    countTable(db, 'user_profiles', { role: 'student', department_id: deptFilter }),
    countTable(db, 'courses', { department_id: deptFilter }),
    clearanceKpi(db, deptFilter),
    countTable(db, 'course_applications', { status: 'pending', department_id: deptFilter }),
    db.from('departments').select('*').order('name'),
  ])

  const stats: Record<string, number> = {
    total_students: totalStudents,
    total_courses: totalCourses,
    pending_admissions: pendingAdmissionsCount,
    pending_clearances: cl.pending,
    completed_clearances: cl.completed,
  }

  if (opts.includeTrainers) {
    stats.total_trainers = await countTable(db, 'user_profiles', {
      role: 'trainer',
      department_id: deptFilter,
    })
  }
  if (opts.includeCerts) {
    stats.certificates_issued = await countTable(db, 'clearance_requests', {
      certificate_issued: true,
      department_id: deptFilter,
    })
  }
  if (opts.includeAssessments) {
    if (deptFilter) {
      const scoped = (status?: string) => {
        let q = db
          .from('assessments')
          .select('id, units!inner(department_id)', { count: 'exact', head: true })
          .eq('units.department_id', deptFilter)
        if (status) q = q.eq('status', status)
        return q.then(
          (r) => r.count ?? 0,
          () => 0,
        )
      }
      stats.total_assessments = await scoped()
      stats.approved_assessments = await scoped('approved')
    } else {
      stats.total_assessments = await countTable(db, 'assessments')
      stats.approved_assessments = await countTable(db, 'assessments', { status: 'approved' })
    }
  }

  let pendingQ = db
    .from('clearance_requests')
    .select(CLEARANCE_SEL)
    .in('status', ['pending', 'in_progress', 'returned'])
    .order('created_at', { ascending: false })
    .limit(50)
  let completedQ = db
    .from('clearance_requests')
    .select(CLEARANCE_SEL)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(50)
  if (deptFilter) {
    pendingQ = pendingQ.eq('department_id', deptFilter)
    completedQ = completedQ.eq('department_id', deptFilter)
  }

  const [pendingClearances, completedClearances] = await Promise.all([pendingQ, completedQ])

  let pendingAdmissions: Row[] = []
  if (opts.includeAdmissions) {
    let q = db
      .from('course_applications')
      .select('*, departments(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)
    if (deptFilter) q = q.eq('department_id', deptFilter)
    const { data } = await q
    pendingAdmissions = (data ?? []) as Row[]
  }

  return {
    stats,
    departments: departments.data ?? [],
    department_filter: departmentFilter,
    pending_clearances: pendingClearances.data ?? [],
    completed_clearances: completedClearances.data ?? [],
    pending_admissions: pendingAdmissions,
  }
}

roles.get('/admin-oversight/registrar', requireRole('registrar'), async (c) => {
  const db = getServiceClient(c.env)
  return ok(c, await oversightPayload(db, c.req.query('department') ?? '', { includeAdmissions: true }))
})

roles.get('/admin-oversight/deputy-principal', requireRole('deputy_principal'), async (c) => {
  const db = getServiceClient(c.env)
  return ok(
    c,
    await oversightPayload(db, c.req.query('department') ?? '', {
      includeTrainers: true,
      includeCerts: true,
    }),
  )
})

roles.get(
  '/admin-oversight/quality-assurance',
  requireRole('quality_assurance_officer'),
  async (c) => {
    const db = getServiceClient(c.env)
    return ok(
      c,
      await oversightPayload(db, c.req.query('department') ?? '', {
        includeTrainers: true,
        includeCerts: true,
        includeAdmissions: true,
        includeAssessments: true,
      }),
    )
  },
)

export default roles
