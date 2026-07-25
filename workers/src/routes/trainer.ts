import { Hono } from 'hono'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getServiceClient } from '../lib/supabase'
import { ok, err } from '../lib/responses'
import { writeAuditLog } from '../lib/audit'
import { requireRole } from '../middleware/auth'
import { saveMarkSchema, addAssessmentSchema, reviewAssessmentSchema, attendanceSubmitSchema } from '../schemas'
import { todayEAT, daysAgoEAT, currentYearEAT, currentMonthLabelEAT } from '../lib/dates'
import type { Env, AppVariables, SessionUser } from '../types'

const trainer = new Hono<{ Bindings: Env; Variables: AppVariables }>()
trainer.use('/trainer/*', requireRole('trainer'))

type Row = Record<string, any>

// ── Helpers (ports of routes/trainer.py helpers) ─────────────────────────────

/** Unit ids this trainer is assigned to: trainer_units ∪ class_units. */
async function trainerAssignedUnitIds(db: SupabaseClient, user: SessionUser): Promise<string[]> {
  const [tu, cu] = await Promise.all([
    db.from('trainer_units').select('unit_id').eq('trainer_id', user.id),
    db.from('class_units').select('unit_id').eq('trainer_id', user.id),
  ])
  const ids = new Set<string>()
  for (const r of tu.data ?? []) if (r.unit_id) ids.add(r.unit_id)
  for (const r of cu.data ?? []) if (r.unit_id) ids.add(r.unit_id)
  return [...ids]
}

/** True if the trainer is assigned to this class+unit pair. */
async function trainerOwnsClassUnit(
  db: SupabaseClient,
  user: SessionUser,
  classId: string,
  unitId: string,
): Promise<boolean> {
  const { data } = await db
    .from('class_units')
    .select('id')
    .eq('class_id', classId)
    .eq('unit_id', unitId)
    .eq('trainer_id', user.id)
    .limit(1)
  return Boolean(data?.length)
}

/** class_units rows + distinct class list for this trainer (marks entry). */
async function marksClassUnitData(db: SupabaseClient, user: SessionUser) {
  const { data: cuRows } = await db
    .from('class_units')
    .select('class_id, unit_id, units(id,code,name), classes(id,name)')
    .eq('trainer_id', user.id)
  const classMap = new Map<string, string>()
  for (const r of cuRows ?? []) {
    const c = (r as Row).classes
    if (c?.id) classMap.set(c.id, c.name)
  }
  const classList = [...classMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return { cuRows: (cuRows ?? []) as Row[], classList }
}

async function loadAssessmentsAndMarks(
  db: SupabaseClient,
  unitId: string,
  classId: string,
  trainerId: string,
  year: number,
  term: number,
) {
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
  const marksMap: Record<string, Record<string, number>> = {}
  const list = (assessments ?? []) as Row[]
  if (list.length) {
    const aIds = list.map((a) => a.id)
    const { data: marks } = await db
      .from('formative_marks')
      .select('assessment_id, student_id, marks_obtained')
      .in('assessment_id', aIds)
    for (const m of marks ?? []) {
      const sid = (m as Row).student_id
      if (!marksMap[sid]) marksMap[sid] = {}
      marksMap[sid][(m as Row).assessment_id] = (m as Row).marks_obtained
    }
  }
  return { assessments: list, marksMap }
}

/** Map POE upload type to formative Oral/Practical/Theory. */
function normalizePoeType(assessmentType: string | null): string {
  const t = (assessmentType ?? '').trim().toLowerCase()
  if (t === 'oral') return 'Oral'
  if (t === 'practical') return 'Practical'
  if (t === 'theory' || t === 'written') return 'Theory'
  const title = (assessmentType ?? '').trim()
  return title ? title.charAt(0).toUpperCase() + title.slice(1).toLowerCase() : 'Theory'
}

/** Find the formative assessment matching a POE upload (port of _match_formative_assessment). */
function matchFormativeAssessment(formativeList: Row[], poeType: string, assessmentNo: unknown): Row | null {
  if (!formativeList.length) return null
  const ano = parseInt(String(assessmentNo ?? 1), 10) || 1
  const typed = formativeList.filter((a) => a.assessment_type === poeType)
  if (!typed.length) return null

  const patterns = new Set([`${poeType} ${ano}`.toLowerCase()])
  if (poeType === 'Theory') {
    patterns.add(`theory ${ano}`)
    patterns.add(`written assessment ${ano}`)
  }
  for (const fa of typed) {
    if (patterns.has((fa.assessment_name ?? '').trim().toLowerCase())) return fa
  }
  for (const fa of typed) {
    const m = /(\d+)\s*$/.exec((fa.assessment_name ?? '').trim())
    if (m && parseInt(m[1], 10) === ano) return fa
  }
  const ordered = [...typed].sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))
  if (ano >= 1 && ano <= ordered.length) return ordered[ano - 1]
  return null
}

/** Attach marks_obtained/max_marks from formative_marks onto POE assessments. */
async function bulkFormativeMarksForPoe(db: SupabaseClient, poeAssessments: Row[]) {
  if (!poeAssessments.length) return

  const scopeKey = (a: Row) => `${a.class_id}|${a.unit_id}|${a.year}|${parseInt(String(a.term ?? 1), 10)}`
  const scopes = new Map<string, { class_id: string; unit_id: string; year: number; term: number }>()
  for (const a of poeAssessments) {
    if (a.class_id && a.unit_id) {
      scopes.set(scopeKey(a), {
        class_id: a.class_id,
        unit_id: a.unit_id,
        year: a.year,
        term: parseInt(String(a.term ?? 1), 10),
      })
    }
  }

  const faByScope = new Map<string, Row[]>()
  await Promise.all(
    [...scopes.entries()].map(async ([key, s]) => {
      const { data } = await db
        .from('formative_assessments')
        .select('id, assessment_type, assessment_name, max_marks, created_at')
        .eq('class_id', s.class_id)
        .eq('unit_id', s.unit_id)
        .eq('year', s.year)
        .eq('term', s.term)
      faByScope.set(key, (data ?? []) as Row[])
    }),
  )

  const allFaIds = [...faByScope.values()].flat().map((fa) => fa.id)
  const marksLookup = new Map<string, number>()
  if (allFaIds.length) {
    const { data: marks } = await db
      .from('formative_marks')
      .select('assessment_id, student_id, marks_obtained')
      .in('assessment_id', allFaIds)
    for (const m of (marks ?? []) as Row[]) {
      marksLookup.set(`${m.student_id}|${m.assessment_id}`, m.marks_obtained)
    }
  }
  const faMax = new Map<string, number>()
  for (const rows of faByScope.values()) {
    for (const fa of rows) faMax.set(fa.id, parseFloat(String(fa.max_marks ?? 100)) || 100)
  }

  for (const a of poeAssessments) {
    const formativeList = faByScope.get(scopeKey(a)) ?? []
    const fa = matchFormativeAssessment(formativeList, normalizePoeType(a.assessment_type), a.assessment_no)
    if (fa) {
      const mark = marksLookup.get(`${a.student_id}|${fa.id}`)
      a.marks_obtained = mark != null ? parseFloat(String(mark)) : 0
      a.max_marks = faMax.get(fa.id) ?? 100
    } else {
      a.marks_obtained = 0
      a.max_marks = 100
    }
  }
}

const fileSlug = (text: unknown): string =>
  String(text ?? '')
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^[_-]+|[_-]+$/g, '') || 'unknown'

/**
 * Rename the assessment script + evidence files after review (best-effort,
 * port of _rename_script_file). Uses storage.move instead of download/re-upload.
 */
async function renameScriptFile(
  db: SupabaseClient,
  assessmentId: string,
  status: 'approved' | 'rejected',
  trainerName: string,
) {
  try {
    const { data: a } = await db
      .from('assessments')
      .select(
        'student_id, unit_id, assessment_type, assessment_no, cycle, term, script_file_path, ' +
          'user_profiles!assessments_student_id_fkey(admission_no), units(name)',
      )
      .eq('id', assessmentId)
      .single()
    if (!a) return

    const row = a as Row
    const admission = fileSlug(row.user_profiles?.admission_no ?? row.student_id)
    const unit = fileSlug(row.units?.name ?? row.unit_id ?? 'unit')
    const atype = fileSlug(row.assessment_type ?? 'FA')
    const ano = String(row.assessment_no ?? '1')
    const cycle = String(row.cycle ?? '1')
    const term = String(row.term ?? '1')
    const statusStr = status === 'approved' ? 'APPROVED' : 'REJECTED'
    const trainerSlug = fileSlug(trainerName)
    const newDisplay = `${admission}_${unit}_${atype}_${ano}_${cycle}_${term}_${statusStr}-${trainerSlug}.pdf`

    const oldPath: string | null = row.script_file_path ?? null
    if (!oldPath) {
      await db.from('assessments').update({ script_file_name: newDisplay }).eq('id', assessmentId)
      return
    }
    const folder = oldPath.includes('/') ? oldPath.slice(0, oldPath.lastIndexOf('/')) : 'scripts'
    const newPath = `${folder}/${newDisplay}`

    await db.storage.from('assessment-scripts').move(oldPath, newPath)
    await db
      .from('assessments')
      .update({ script_file_name: newDisplay, script_file_path: newPath })
      .eq('id', assessmentId)

    const { data: evidenceList } = await db
      .from('evidence')
      .select('id, file_path, file_name')
      .eq('assessment_id', assessmentId)
      .order('uploaded_at')
    const evs = (evidenceList ?? []) as Row[]
    for (let i = 0; i < evs.length; i++) {
      const ev = evs[i]
      const oldEv: string | null = ev.file_path ?? null
      if (!oldEv) continue
      const ext = oldEv.includes('.') ? oldEv.slice(oldEv.lastIndexOf('.') + 1).toLowerCase() : 'jpg'
      const suffix = evs.length > 1 ? `-ev${i + 1}` : ''
      const newEvName = `${admission}_${unit}_${atype}_${ano}_${cycle}_${term}_${statusStr}-${trainerSlug}${suffix}.${ext}`
      const evFolder = oldEv.includes('/') ? oldEv.slice(0, oldEv.lastIndexOf('/')) : 'evidence'
      const newEvPath = `${evFolder}/${newEvName}`
      try {
        await db.storage.from('assessment-evidence').move(oldEv, newEvPath)
        await db.from('evidence').update({ file_name: newEvName, file_path: newEvPath }).eq('id', ev.id)
      } catch {
        // best-effort per file
      }
    }
  } catch {
    // Renaming is cosmetic — never fail the review because of it.
  }
}

const exactCount = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0

// ── GET /trainer/dashboard ────────────────────────────────────────────────────

trainer.get('/trainer/dashboard', async (c) => {
  const db = getServiceClient(c.env)
  const user = c.get('user')

  const stats: Record<string, number> = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    trips_uploaded: 0,
    clearance_pending: 0,
    summative_nyc: 0,
  }
  let pendingAssessments: Row[] = []
  let unitsList: Row[] = []
  let attUnitLabels: string[] = []
  let attUnitPresent: number[] = []
  let attUnitAbsent: number[] = []
  let assessUnitLabels: string[] = []
  let assessUnitPending: number[] = []
  let assessUnitApproved: number[] = []
  let assessUnitRejected: number[] = []
  const trendLabels: string[] = []
  const trendPresent: number[] = []
  const trendAbsent: number[] = []

  try {
    const assignedUnitIds = await trainerAssignedUnitIds(db, user)

    if (assignedUnitIds.length) {
      const [total, pending, approved, rejected] = await Promise.all([
        exactCount(db.from('assessments').select('id', { count: 'exact', head: true }).in('unit_id', assignedUnitIds)),
        exactCount(
          db
            .from('assessments')
            .select('id', { count: 'exact', head: true })
            .in('unit_id', assignedUnitIds)
            .eq('status', 'pending'),
        ),
        exactCount(
          db
            .from('assessments')
            .select('id', { count: 'exact', head: true })
            .in('unit_id', assignedUnitIds)
            .eq('status', 'approved'),
        ),
        exactCount(
          db
            .from('assessments')
            .select('id', { count: 'exact', head: true })
            .in('unit_id', assignedUnitIds)
            .eq('status', 'rejected'),
        ),
      ])
      stats.total = total
      stats.pending = pending
      stats.approved = approved
      stats.rejected = rejected
    }

    stats.trips_uploaded = await exactCount(
      db.from('academic_trips').select('id', { count: 'exact', head: true }).eq('uploaded_by', user.id),
    ).catch(() => 0)
    stats.clearance_pending = await exactCount(
      db
        .from('clearance_approvals')
        .select('id', { count: 'exact', head: true })
        .eq('approver_id', user.id)
        .eq('status', 'pending'),
    ).catch(() => 0)

    if (assignedUnitIds.length) {
      const [pendingRes, unitsRes, attRes, assessRes, weekRes] = await Promise.all([
        db
          .from('assessments')
          .select(
            '*, user_profiles!assessments_student_id_fkey(full_name, admission_no), units(name), classes(name)',
          )
          .eq('status', 'pending')
          .in('unit_id', assignedUnitIds)
          .order('uploaded_at', { ascending: false })
          .limit(15),
        db.from('units').select('id, code, name').in('id', assignedUnitIds).order('name'),
        db.from('attendance').select('status, units!inner(name)').in('unit_id', assignedUnitIds),
        db.from('assessments').select('status, units!inner(name)').in('unit_id', assignedUnitIds),
        // Single query for the 7-day trend instead of Flask's 14+ count queries
        db
          .from('attendance')
          .select('status, attendance_date')
          .in('unit_id', assignedUnitIds)
          .gte('attendance_date', daysAgoEAT(6)),
      ])

      pendingAssessments = (pendingRes.data ?? []) as Row[]
      unitsList = (unitsRes.data ?? []) as Row[]

      const attMap = new Map<string, { present: number; absent: number }>()
      for (const row of (attRes.data ?? []) as Row[]) {
        const uname = row.units?.name ?? 'Unknown'
        const b = attMap.get(uname) ?? { present: 0, absent: 0 }
        if (row.status === 'present') b.present += 1
        else b.absent += 1
        attMap.set(uname, b)
      }
      attUnitLabels = [...attMap.keys()]
      attUnitPresent = attUnitLabels.map((u) => attMap.get(u)!.present)
      attUnitAbsent = attUnitLabels.map((u) => attMap.get(u)!.absent)

      const aMap = new Map<string, Record<string, number>>()
      for (const row of (assessRes.data ?? []) as Row[]) {
        const uname = row.units?.name ?? 'Unknown'
        const b = aMap.get(uname) ?? { pending: 0, approved: 0, rejected: 0 }
        const s = row.status ?? 'pending'
        b[s] = (b[s] ?? 0) + 1
        aMap.set(uname, b)
      }
      assessUnitLabels = [...aMap.keys()]
      assessUnitPending = assessUnitLabels.map((u) => aMap.get(u)!.pending ?? 0)
      assessUnitApproved = assessUnitLabels.map((u) => aMap.get(u)!.approved ?? 0)
      assessUnitRejected = assessUnitLabels.map((u) => aMap.get(u)!.rejected ?? 0)

      const byDay = new Map<string, { present: number; total: number }>()
      for (const row of (weekRes.data ?? []) as Row[]) {
        const day = String(row.attendance_date ?? '')
        const b = byDay.get(day) ?? { present: 0, total: 0 }
        b.total += 1
        if (row.status === 'present') b.present += 1
        byDay.set(day, b)
      }
      for (let i = 6; i >= 0; i--) {
        const day = daysAgoEAT(i)
        trendLabels.push(day.slice(5))
        const b = byDay.get(day) ?? { present: 0, total: 0 }
        trendPresent.push(b.present)
        trendAbsent.push(Math.max(0, b.total - b.present))
      }
    } else {
      for (let i = 6; i >= 0; i--) {
        trendLabels.push(daysAgoEAT(i).slice(5))
        trendPresent.push(0)
        trendAbsent.push(0)
      }
    }
  } catch (exc) {
    console.error(`[api_v1] trainer dashboard error: ${exc}`)
    return err(c, 'Could not load trainer dashboard.', 500)
  }

  return ok(c, {
    current_month: currentMonthLabelEAT(),
    stats,
    pending_assessments: pendingAssessments,
    units_list: unitsList,
    analytics: {
      att_unit_labels: attUnitLabels,
      att_unit_present: attUnitPresent,
      att_unit_absent: attUnitAbsent,
      assess_unit_labels: assessUnitLabels,
      assess_unit_pending: assessUnitPending,
      assess_unit_approved: assessUnitApproved,
      assess_unit_rejected: assessUnitRejected,
      trend_labels: trendLabels,
      trend_present: trendPresent,
      trend_absent: trendAbsent,
    },
  })
})

// ── Marks entry ───────────────────────────────────────────────────────────────

trainer.get('/trainer/marks-entry', async (c) => {
  const db = getServiceClient(c.env)
  const user = c.get('user')
  const { cuRows, classList } = await marksClassUnitData(db, user)

  const classId = c.req.query('class_id') ?? ''
  const unitId = c.req.query('unit_id') ?? ''
  const year = parseInt(c.req.query('year') ?? '', 10) || currentYearEAT()
  const term = parseInt(c.req.query('term') ?? '', 10) || 1

  const unitsList: Row[] = []
  let studentsList: Row[] = []
  let assessments: Row[] = []
  let marksMap: Record<string, Record<string, number>> = {}

  if (classId) {
    for (const r of cuRows) {
      if (r.classes?.id === classId && r.units?.id) {
        unitsList.push({ id: r.units.id, code: r.units.code, name: r.units.name })
      }
    }
  }

  if (classId && unitId) {
    const { data: raw } = await db
      .from('enrollments')
      .select('student_id, user_profiles(full_name, admission_no)')
      .eq('class_id', classId)
    studentsList = ((raw ?? []) as Row[]).sort((a, b) =>
      String(a.user_profiles?.full_name ?? '').localeCompare(String(b.user_profiles?.full_name ?? '')),
    )
    const loaded = await loadAssessmentsAndMarks(db, unitId, classId, user.id, year, term)
    assessments = loaded.assessments
    marksMap = loaded.marksMap
  }

  return ok(c, {
    class_list: classList,
    units_list: unitsList,
    students_list: studentsList,
    assessments,
    oral_list: assessments.filter((a) => a.assessment_type === 'Oral'),
    practical_list: assessments.filter((a) => a.assessment_type === 'Practical'),
    theory_list: assessments.filter((a) => a.assessment_type === 'Theory'),
    marks_map: marksMap,
    class_id: classId,
    unit_id: unitId,
    year,
    term,
  })
})

trainer.post('/trainer/marks-entry/save-mark', async (c) => {
  const db = getServiceClient(c.env)
  const user = c.get('user')
  const body = await c.req.json().catch(() => ({}))
  const parsed = saveMarkSchema.safeParse(body)
  if (!parsed.success) return err(c, 'Missing fields.', 400)
  const { assessment_id, student_id } = parsed.data
  const marksRaw = parsed.data.marks

  const { data: rec } = await db
    .from('formative_assessments')
    .select('trainer_id, max_marks')
    .eq('id', assessment_id)
    .single()
  if (!rec || rec.trainer_id !== user.id) return err(c, 'Access denied.', 403, 'forbidden')

  if (marksRaw === '' || marksRaw === null || marksRaw === undefined) {
    const { error } = await db
      .from('formative_marks')
      .delete()
      .eq('assessment_id', assessment_id)
      .eq('student_id', student_id)
    if (error) return err(c, error.message, 500)
    return c.json({ ok: true, success: true, cleared: true })
  }

  const marksVal = typeof marksRaw === 'number' ? marksRaw : parseFloat(marksRaw)
  if (Number.isNaN(marksVal)) return err(c, 'Marks must be a number.', 400)

  const maxM = parseFloat(String(rec.max_marks ?? 100)) || 100
  if (marksVal < 0) return err(c, 'Marks cannot be negative.', 400)
  if (marksVal > maxM) return err(c, `Cannot exceed ${Math.trunc(maxM)}.`, 400)

  const { data: existing } = await db
    .from('formative_marks')
    .select('id')
    .eq('assessment_id', assessment_id)
    .eq('student_id', student_id)
  if (existing?.length) {
    const { error } = await db
      .from('formative_marks')
      .update({ marks_obtained: marksVal, uploaded_by: user.id, updated_at: new Date().toISOString() })
      .eq('id', existing[0].id)
    if (error) return err(c, error.message, 500)
  } else {
    const { error } = await db.from('formative_marks').insert({
      assessment_id,
      student_id,
      marks_obtained: marksVal,
      uploaded_by: user.id,
    })
    if (error) return err(c, error.message, 500)
  }
  return c.json({ ok: true, success: true })
})

trainer.post('/trainer/marks-entry/add-assessment', async (c) => {
  const db = getServiceClient(c.env)
  const user = c.get('user')
  const body = await c.req.json().catch(() => ({}))
  const parsed = addAssessmentSchema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    if (issue?.path?.[0] === 'assessment_type') return err(c, 'Invalid type.', 400)
    if (issue?.path?.[0] === 'max_marks') {
      return err(c, 'Maximum marks must be between 1 and 100. Scores convert to % out of 100.', 400)
    }
    return err(c, 'All fields are required.', 400)
  }
  const data = parsed.data
  const year = data.year ?? currentYearEAT()

  if (!(await trainerOwnsClassUnit(db, user, data.class_id, data.unit_id))) {
    return err(c, 'You are not assigned to this class/unit.', 403, 'forbidden')
  }

  const { data: dup } = await db
    .from('formative_assessments')
    .select('id')
    .eq('unit_id', data.unit_id)
    .eq('class_id', data.class_id)
    .eq('trainer_id', user.id)
    .eq('assessment_name', data.assessment_name)
    .eq('year', year)
    .eq('term', data.term)
  if (dup?.length) return err(c, `'${data.assessment_name}' already exists.`, 400)

  const { data: result, error } = await db
    .from('formative_assessments')
    .insert({
      unit_id: data.unit_id,
      class_id: data.class_id,
      trainer_id: user.id,
      assessment_type: data.assessment_type,
      assessment_name: data.assessment_name,
      max_marks: data.max_marks,
      year,
      term: data.term,
    })
    .select()
  if (error) return err(c, error.message, 500)

  writeAuditLog(c, 'add_formative_assessment', `unit:${data.unit_id},${data.assessment_type}:${data.assessment_name}`)
  return ok(c, { assessment: result?.[0] ?? {} })
})

// ── POE assessments ───────────────────────────────────────────────────────────

trainer.get('/trainer/assessments', async (c) => {
  const db = getServiceClient(c.env)
  const user = c.get('user')
  const assignedUnitIds = await trainerAssignedUnitIds(db, user)

  let assessmentsList: Row[] = []
  if (assignedUnitIds.length) {
    const { data } = await db
      .from('assessments')
      .select(
        '*, ' +
          'user_profiles!assessments_student_id_fkey(full_name, admission_no), ' +
          'reviewer:user_profiles!assessments_reviewed_by_fkey(full_name), ' +
          'units(name, code), ' +
          'classes(id, name)',
      )
      .in('unit_id', assignedUnitIds)
      .order('uploaded_at', { ascending: false })
    assessmentsList = (data ?? []) as Row[]
  }
  await bulkFormativeMarksForPoe(db, assessmentsList)

  const classesMap = new Map<string, Row>()
  const statusCounts: Record<string, number> = { total: 0, pending: 0, approved: 0, rejected: 0 }
  for (const a of assessmentsList) {
    statusCounts.total += 1
    const s = a.status ?? 'pending'
    if (s in statusCounts) statusCounts[s] += 1
    const cls = a.classes ?? {}
    const cid = cls.id
    if (!cid) continue
    if (!classesMap.has(cid)) classesMap.set(cid, { id: cid, name: cls.name ?? '', units: new Map<string, Row>() })
    const u = a.units ?? {}
    const uid = a.unit_id
    if (!uid) continue
    const unitsMap: Map<string, Row> = classesMap.get(cid)!.units
    if (!unitsMap.has(uid)) {
      unitsMap.set(uid, {
        id: uid,
        name: u.name ?? '',
        code: u.code ?? '',
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        assessments: [],
      })
    }
    const bucket = unitsMap.get(uid)!
    bucket.total += 1
    bucket[s] = (bucket[s] ?? 0) + 1
    bucket.assessments.push(a)
  }

  const classList: Row[] = []
  for (const [cid, cdata] of classesMap) {
    const unitList = [...(cdata.units as Map<string, Row>).values()]
    classList.push({
      id: cid,
      name: cdata.name,
      units: unitList.sort((a, b) => String(a.name).localeCompare(String(b.name))),
      unit_count: unitList.length,
      pending: unitList.reduce((sum, u) => sum + (u.pending ?? 0), 0),
    })
  }
  classList.sort((a, b) => String(a.name).localeCompare(String(b.name)))
  return ok(c, { classes: classList, status_counts: statusCounts })
})

trainer.post('/trainer/assessments/:assessment_id/review', async (c) => {
  const db = getServiceClient(c.env)
  const user = c.get('user')
  const assessmentId = c.req.param('assessment_id')
  const body = await c.req.json().catch(() => ({}))
  const parsed = reviewAssessmentSchema.safeParse(body)
  if (!parsed.success) return err(c, 'action must be approve or reject.', 400)
  const { action, review_note } = parsed.data

  const { data: rows } = await db
    .from('assessments')
    .select('id, unit_id, status')
    .eq('id', assessmentId)
    .limit(1)
  const assessment = rows?.[0]
  if (!assessment) return err(c, 'Assessment not found.', 404)

  const assigned = await trainerAssignedUnitIds(db, user)
  if (!assigned.length || !assigned.includes(assessment.unit_id)) {
    return err(c, 'Forbidden.', 403, 'forbidden')
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected'
  const { error } = await db
    .from('assessments')
    .update({
      status: newStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: review_note || null,
    })
    .eq('id', assessmentId)
  if (error) return err(c, error.message, 500)

  // File rename is cosmetic — run after the response like Flask's try/except pass.
  c.executionCtx.waitUntil(renameScriptFile(db, assessmentId, newStatus, user.full_name ?? ''))

  writeAuditLog(c, `assessment_${newStatus}`, `assessment:${assessmentId}`)
  return ok(c, { status: newStatus })
})

// ── Attendance ────────────────────────────────────────────────────────────────

const LESSONS = [
  { id: 'L1', label: '08:00–10:00' },
  { id: 'L2', label: '10:15–12:15' },
  { id: 'L3', label: '12:45–02:45' },
  { id: 'L4', label: '03:00–05:00' },
]

trainer.get('/trainer/attendance', async (c) => {
  const db = getServiceClient(c.env)
  const user = c.get('user')
  const deptId = user.department_id

  const { data: cuRows } = await db.from('class_units').select('class_id').eq('trainer_id', user.id)
  const classIds = [...new Set(((cuRows ?? []) as Row[]).map((r) => r.class_id))]
  let classList: Row[] = []
  if (classIds.length) {
    let q = db.from('classes').select('id, name').in('id', classIds).order('name')
    if (deptId) q = q.eq('department_id', deptId)
    classList = ((await q).data ?? []) as Row[]
  }

  const classId = c.req.query('class_id') ?? ''
  const unitId = c.req.query('unit_id') ?? ''
  const week = parseInt(c.req.query('week') ?? '0', 10) || 0
  const lesson = c.req.query('lesson') ?? ''
  const year = parseInt(c.req.query('year') ?? '', 10) || currentYearEAT()
  const term = parseInt(c.req.query('term') ?? '', 10) || 1

  let unitsList: Row[] = []
  let studentsList: Row[] = []
  let attendanceSubmitted = false
  let activeEvent: Row | null = null

  if (classId) {
    const [unitsRes, studentsRes] = await Promise.all([
      db
        .from('class_units')
        .select('unit_id, units(id, code, name)')
        .eq('class_id', classId)
        .eq('trainer_id', user.id),
      db.from('enrollments').select('student_id, user_profiles(full_name, admission_no)').eq('class_id', classId),
    ])
    unitsList = (unitsRes.data ?? []) as Row[]
    studentsList = (studentsRes.data ?? []) as Row[]

    if (unitId && week && lesson) {
      const [existing, eventRes] = await Promise.all([
        db
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .eq('unit_id', unitId)
          .eq('trainer_id', user.id)
          .eq('week', week)
          .eq('lesson', lesson)
          .eq('year', year)
          .eq('term', term),
        db
          .from('class_events')
          .select('*')
          .eq('class_id', classId)
          .eq('trainer_id', user.id)
          .eq('week', week)
          .eq('lesson', lesson)
          .eq('year', year)
          .eq('term', term),
      ])
      attendanceSubmitted = (existing.count ?? 0) > 0
      activeEvent = (eventRes.data as Row[])?.[0] ?? null
    }
  }

  return ok(c, {
    class_list: classList,
    units_list: unitsList.map((u) => ({
      id: u.units?.id ?? u.unit_id,
      code: u.units?.code,
      name: u.units?.name,
    })),
    students_list: studentsList,
    attendance_submitted: attendanceSubmitted,
    active_event: activeEvent,
    class_id: classId,
    unit_id: unitId,
    week,
    lesson,
    year,
    term,
    lessons: LESSONS,
  })
})

trainer.post('/trainer/attendance/submit', async (c) => {
  const db = getServiceClient(c.env)
  const user = c.get('user')
  const body = await c.req.json().catch(() => ({}))
  const parsed = attendanceSubmitSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Class, unit, week and lesson are required.'
    return err(c, msg, 400)
  }
  const data = parsed.data
  const year = data.year ?? parseInt(todayEAT().slice(0, 4), 10)
  if (!Object.keys(data.statuses).length) return err(c, 'No student statuses provided.', 400)

  const { data: assigned } = await db
    .from('class_units')
    .select('id')
    .eq('class_id', data.class_id)
    .eq('unit_id', data.unit_id)
    .eq('trainer_id', user.id)
    .limit(1)
  if (!assigned?.length) return err(c, 'You are not assigned to this class/unit.', 403, 'forbidden')

  const { data: enrolled } = await db.from('enrollments').select('student_id').eq('class_id', data.class_id)
  const enrolledIds = new Set(((enrolled ?? []) as Row[]).map((e) => e.student_id).filter(Boolean))

  const { count: existingCount } = await db
    .from('attendance')
    .select('id', { count: 'exact', head: true })
    .eq('unit_id', data.unit_id)
    .eq('trainer_id', user.id)
    .eq('week', data.week)
    .eq('lesson', data.lesson)
    .eq('year', year)
    .eq('term', data.term)
  if ((existingCount ?? 0) > 0) {
    return err(c, 'Attendance already submitted for this session.', 409, 'already_submitted')
  }

  const rows = Object.entries(data.statuses)
    .filter(([sid]) => enrolledIds.has(sid))
    .map(([sid, status]) => ({
      student_id: sid,
      unit_id: data.unit_id,
      unit_code: data.unit_code,
      trainer_id: user.id,
      lesson: data.lesson,
      week: data.week,
      year,
      term: data.term,
      status: status === 'present' ? 'present' : 'absent',
    }))
  const { error } = await db.from('attendance').insert(rows)
  if (error) return err(c, error.message, 500)

  writeAuditLog(c, 'submit_attendance', `class:${data.class_id},unit:${data.unit_id}`)
  return ok(c, { submitted: true })
})

export default trainer
