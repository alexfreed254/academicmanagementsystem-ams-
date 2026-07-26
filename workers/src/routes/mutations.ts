/**
 * Write / mutation endpoints that complete the React SPA migration.
 * Mirrors the critical POST actions from Flask Jinja portals.
 */
import { Hono } from 'hono'
import { getServiceClient } from '../lib/supabase'
import { ok, err } from '../lib/responses'
import { requireAuth, requireRole, deptIsolationCheck } from '../middleware/auth'
import { writeAuditLog } from '../lib/audit'
import { generateWerkzeugHash } from '../lib/passwords'
import { decodeBase64Payload, fileSlug, uploadBytes } from '../lib/storageUpload'
import {
  studentCanSubmitPlacement,
  haversineMeters,
  INDUSTRIES,
} from '../lib/attachmentHelpers'
import type { Env, AppVariables } from '../types'

const mutations = new Hono<{ Bindings: Env; Variables: AppVariables }>()

type Row = Record<string, unknown>

const STAFF_ROLES = new Set([
  'super_admin',
  'dept_admin',
  'trainer',
  'examination_officer',
  'industry_mentor',
  'internal_verifier',
  'liaison_officer',
  'cdacc_verifier',
  'workshop_technician',
  'registrar',
  'deputy_principal',
  'quality_assurance_officer',
  'library_hod',
  'sports_hod',
  'service_clearance_officer',
  'environment_hod',
  'dean_students',
  'finance_officer',
])

async function bodyJson(c: { req: { json: () => Promise<unknown> } }): Promise<Row> {
  try {
    const raw = await c.req.json()
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Row) : {}
  } catch {
    return {}
  }
}

function nowIso() {
  return new Date().toISOString()
}

function genTempPassword(length = 10): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

/* ── Clearance ───────────────────────────────────────────────────────────── */

mutations.post('/clearance/approvals/:id/approve', requireAuth, async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const body = await bodyJson(c)
  const comments = String(body.comments || '').trim()

  const { data: approval } = await db
    .from('clearance_approvals')
    .select('*, clearance_requests(id, student_id, status, stage, department_id)')
    .eq('id', id)
    .maybeSingle()

  if (!approval) return err(c, 'Approval record not found.', 404)
  const row = approval as Row
  const req = (row.clearance_requests as Row) || {}

  if (row.approver_id && row.approver_id !== user.id) {
    return err(c, 'Not assigned to this clearance step.', 403, 'forbidden')
  }
  if (row.status !== 'pending') return err(c, 'This clearance step is no longer pending.', 400)
  if (['completed', 'cancelled', 'rejected'].includes(String(req.status || ''))) {
    return err(c, 'This clearance request can no longer be changed.', 400)
  }

  await db
    .from('clearance_approvals')
    .update({
      status: 'approved',
      approver_id: user.id,
      comments: comments || null,
      approved_at: nowIso(),
    })
    .eq('id', id)

  const studentId = req.student_id as string | undefined
  if (studentId) {
    await db.from('notifications').insert({
      user_id: studentId,
      title: 'Clearance step approved',
      message: 'A clearance approval has been granted. Check your clearance status.',
      notification_type: 'success',
      action_url: '/clearance/',
      is_read: false,
    })
  }

  writeAuditLog(c, 'approve_clearance', `approval:${id}`)
  return ok(c, { approved: true })
})

mutations.post('/clearance/approvals/:id/reject', requireAuth, async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const body = await bodyJson(c)
  const comments = String(body.comments || '').trim()
  if (!comments) return err(c, 'Reason for rejection is required.', 400)

  const { data: approval } = await db
    .from('clearance_approvals')
    .select('*, clearance_requests(id, student_id, status)')
    .eq('id', id)
    .maybeSingle()

  if (!approval) return err(c, 'Approval record not found.', 404)
  const row = approval as Row
  const req = (row.clearance_requests as Row) || {}

  if (row.approver_id && row.approver_id !== user.id) {
    return err(c, 'Not assigned to this clearance step.', 403, 'forbidden')
  }
  if (row.status !== 'pending') return err(c, 'This clearance step is no longer pending.', 400)

  await db
    .from('clearance_approvals')
    .update({
      status: 'rejected',
      approver_id: user.id,
      comments,
      approved_at: nowIso(),
    })
    .eq('id', id)

  const studentId = req.student_id as string | undefined
  if (studentId) {
    await db.from('notifications').insert({
      user_id: studentId,
      title: 'Clearance step rejected',
      message: comments,
      notification_type: 'warning',
      action_url: '/clearance/',
      is_read: false,
    })
  }

  writeAuditLog(c, 'reject_clearance', `approval:${id}`)
  return ok(c, { rejected: true })
})

mutations.post('/clearance/student/start', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const courseId = String(body.course_id || '').trim()
  if (!courseId) return err(c, 'Course is required.', 400)

  const { data: existing } = await db
    .from('clearance_requests')
    .select('id, status')
    .eq('student_id', user.id)
    .eq('course_id', courseId)
    .maybeSingle()

  if (existing && !['cancelled', 'rejected'].includes(String((existing as Row).status))) {
    return err(c, 'You already have an active clearance request for this course.', 400)
  }

  const { data, error } = await db
    .from('clearance_requests')
    .insert({
      student_id: user.id,
      course_id: courseId,
      department_id: user.department_id,
      status: 'pending',
      stage: 1,
    })
    .select('id')
    .single()

  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'start_clearance', `request:${(data as Row).id}`)
  return ok(c, { request_id: (data as Row).id })
})

/* ── Exam bookings ───────────────────────────────────────────────────────── */

mutations.post('/student/documents/profile', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const updates: Record<string, unknown> = {}
  for (const key of ['gender', 'mobile_number', 'national_id_no', 'date_of_birth', 'county', 'sub_county', 'village']) {
    if (body[key] !== undefined) {
      const v = String(body[key] ?? '').trim()
      updates[key] = v || null
    }
  }
  if (!Object.keys(updates).length) return err(c, 'No profile fields to update.', 400)

  let data = { ...updates }
  for (let i = 0; i < 10; i++) {
    const { error } = await db.from('user_profiles').update(data).eq('id', user.id)
    if (!error) {
      writeAuditLog(c, 'update_profile', `user:${user.id}`)
      return ok(c, { updated: true })
    }
    const msg = error.message || ''
    const unknownCol = msg.match(/'(\w+)' column/) || msg.match(/Could not find the '(\w+)' column/)
    if (unknownCol) {
      delete data[unknownCol[1]]
      if (!Object.keys(data).length) return err(c, 'Profile could not be saved — DB migration required.', 400)
      continue
    }
    return err(c, msg, 400)
  }
  return err(c, 'Profile could not be saved.', 400)
})

mutations.post('/student/documents/upload', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const files = Array.isArray(body.files) ? (body.files as Row[]) : []
  if (!files.length) return err(c, 'No files were selected.', 400)

  const allowed = new Set([
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
  ])

  let uploaded = 0
  const errors: string[] = []
  const base = c.env.SUPABASE_URL.replace(/\/$/, '')

  for (const file of files) {
    const docType = String(file.document_type || '').trim()
    const fileName = String(file.file_name || '').trim()
    const b64 = String(file.file_base64 || '').trim()
    if (!allowed.has(docType) || !fileName || !b64) {
      errors.push(`${docType || 'file'}: invalid payload`)
      continue
    }
    const docLabel = docType.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
    try {
      const bytes = decodeBase64Payload(b64)
      if (bytes.length > 5 * 1024 * 1024) {
        errors.push(`${docLabel}: file too large (max 5MB)`)
        continue
      }
      const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : 'bin'
      if (!['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        errors.push(`${docLabel}: unsupported file type`)
        continue
      }
      const storagePath = `trainee_documents/${user.id}_${docType}_${crypto.randomUUID().replace(/-/g, '')}.${ext}`
      const contentType = String(file.content_type || 'application/octet-stream')
      await uploadBytes(db, 'assessment-evidence', storagePath, bytes, contentType)
      const publicUrl = `${base}/storage/v1/object/public/assessment-evidence/${storagePath}`

      const { data: existing } = await db
        .from('student_personal_documents')
        .select('id')
        .eq('student_id', user.id)
        .eq('document_type', docType)
        .limit(1)

      const payload = {
        document_name: docLabel,
        file_url: publicUrl,
        file_path: storagePath,
        file_name: fileName,
        file_size: bytes.length,
        status: 'pending',
      }
      const row = ((existing ?? []) as Row[])[0]
      if (row?.id) {
        const { error } = await db.from('student_personal_documents').update(payload).eq('id', row.id as string)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await db.from('student_personal_documents').insert({
          student_id: user.id,
          document_type: docType,
          ...payload,
        })
        if (error) throw new Error(error.message)
      }
      uploaded += 1
    } catch (e) {
      errors.push(`${docLabel}: ${e instanceof Error ? e.message : 'upload failed'}`)
    }
  }

  if (uploaded) writeAuditLog(c, 'upload_documents', `user:${user.id}`)
  if (!uploaded && errors.length) return err(c, errors.join('; '), 400)
  return ok(c, { uploaded, errors })
})

mutations.post('/student/exam-bookings', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)

  // Form 1A multi-unit submit (mirrors Flask exam_booking_submit)
  const selectedUnits = Array.isArray(body.selected_units)
    ? (body.selected_units as unknown[]).map((u) => String(u).trim()).filter(Boolean)
    : body.unit_id
      ? [String(body.unit_id).trim()]
      : []

  if (!selectedUnits.length) return err(c, 'Please select at least one unit of competency.', 400)

  const year = Number(body.exam_year || body.year) || new Date().getFullYear()
  const series = Number(body.exam_series || 1) || 1
  const term = Number(body.term) || 1
  const moduleLevel = String(body.module_level || '').trim()
  const serialNumber = `TTTI-${year}-EXAM-${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`

  const { data: enrollment } = await db
    .from('enrollments')
    .select('class_id')
    .eq('student_id', user.id)
    .limit(1)
    .maybeSingle()
  const classId = (enrollment as Row | null)?.class_id ?? null

  const attempts = (body.attempt_types as Record<string, string> | undefined) || {}
  const costs = (body.unit_costs as Record<string, string> | undefined) || {}
  const types = (body.unit_types as Record<string, string> | undefined) || {}

  const createdIds: string[] = []
  for (const unitId of selectedUnits) {
    const { data: unit } = await db.from('units').select('id, name, code').eq('id', unitId).maybeSingle()
    if (!unit) continue
    const unitType =
      ['Core', 'Common', 'Basic'].includes(String(types[unitId] || ''))
        ? String(types[unitId])
        : inferUnitTypeFromCode(String((unit as Row).code || ''))
    const attempt = String(attempts[unitId] || 'first_attempt')
    const costRaw = costs[unitId]
    const payload: Record<string, unknown> = {
      student_id: user.id,
      unit_id: unitId,
      class_id: classId,
      exam_date: String(body.exam_date || new Date().toISOString().slice(0, 10)),
      exam_year: year,
      exam_series_no: series,
      exam_term: term,
      year,
      term,
      exam_session: SERIES_LABEL[series] || String(body.exam_session || 'MARCH'),
      purpose: `${unitType} — ${moduleLevel}`.slice(0, 200),
      attempt_type: attempt,
      serial_number: serialNumber,
      status: 'pending',
    }
    if (costRaw !== undefined && costRaw !== '') {
      const n = Number(costRaw)
      if (!Number.isNaN(n)) payload.unit_cost = n
    }

    // Insert with graceful column stripping for schema drift (mirrors Flask)
    let data = { ...payload }
    let inserted = false
    for (let i = 0; i < 15 && !inserted; i++) {
      const { data: row, error } = await db.from('exam_bookings').insert(data).select('id').single()
      if (!error && row) {
        createdIds.push(String((row as Row).id))
        inserted = true
        break
      }
      const msg = error?.message || ''
      const unknownCol = msg.match(/'(\w+)' column/) || msg.match(/Could not find the '(\w+)' column/)
      if (unknownCol) {
        delete data[unknownCol[1]]
        continue
      }
      // Duplicate → upsert-ish reset to pending
      if (/duplicate|23505/i.test(msg)) {
        await db
          .from('exam_bookings')
          .update({ status: 'pending', serial_number: serialNumber })
          .eq('student_id', user.id)
          .eq('unit_id', unitId)
        inserted = true
        break
      }
      return err(c, msg || 'Could not create exam booking.', 400)
    }
  }

  if (!createdIds.length) return err(c, 'Could not create exam booking.', 400)
  writeAuditLog(c, 'create_exam_booking', `booking:${serialNumber}`)
  return ok(c, { booking_ids: createdIds, serial_number: serialNumber, submitted: true })
})

const SERIES_LABEL: Record<number, string> = { 1: 'MARCH', 2: 'JULY', 3: 'NOVEMBER' }

function inferUnitTypeFromCode(code: string): string {
  const raw = String(code || '')
    .trim()
    .toUpperCase()
  if (!raw) return 'Core'
  const normalized = raw.replace(/[^A-Z0-9]+/g, '/').replace(/^\/+|\/+$/g, '')
  if (/(^|\/)CC(\/|$|\d)/.test(normalized)) return 'Common'
  if (/(^|\/)BC(\/|$|\d)/.test(normalized)) return 'Basic'
  if (/(^|\/)CR(\/|$|\d)/.test(normalized)) return 'Core'
  return 'Core'
}

mutations.post('/dept-admin/exam-bookings/:id/approve', requireRole('dept_admin'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const { data: booking } = await db.from('exam_bookings').select('*').eq('id', id).maybeSingle()
  if (!booking) return err(c, 'Booking not found.', 404)
  if ((booking as Row).status !== 'pending') return err(c, 'Only pending bookings can be updated.', 400)
  await db
    .from('exam_bookings')
    .update({ status: 'approved', approved_by: user.id, approved_at: nowIso() })
    .eq('id', id)
  const studentId = (booking as Row).student_id as string
  if (studentId) {
    await db.from('notifications').insert({
      user_id: studentId,
      title: 'Exam booking approved',
      message: 'Your Form 1A exam booking was approved.',
      notification_type: 'success',
      action_url: '/student/exam-bookings',
      is_read: false,
    })
  }
  writeAuditLog(c, 'approved_exam_booking', `booking:${id}`)
  return ok(c, { approved: true })
})

mutations.post('/dept-admin/exam-bookings/:id/reject', requireRole('dept_admin'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const body = await bodyJson(c)
  const comments = String(body.comments || '').trim()
  const { data: booking } = await db.from('exam_bookings').select('*').eq('id', id).maybeSingle()
  if (!booking) return err(c, 'Booking not found.', 404)
  if ((booking as Row).status !== 'pending') return err(c, 'Only pending bookings can be updated.', 400)
  await db
    .from('exam_bookings')
    .update({ status: 'rejected', approved_by: user.id, approved_at: nowIso(), comments: comments || null })
    .eq('id', id)
  writeAuditLog(c, 'rejected_exam_booking', `booking:${id}`)
  return ok(c, { rejected: true })
})

mutations.post('/super-admin/exam-bookings/:id/approve', requireRole('super_admin'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const { data: booking } = await db.from('exam_bookings').select('*').eq('id', id).maybeSingle()
  if (!booking) return err(c, 'Booking not found.', 404)
  if ((booking as Row).status !== 'pending') return err(c, 'Only pending bookings can be updated.', 400)
  await db
    .from('exam_bookings')
    .update({ status: 'approved', approved_by: user.id, approved_at: nowIso() })
    .eq('id', id)
  writeAuditLog(c, 'approved_exam_booking', `booking:${id}`)
  return ok(c, { approved: true })
})

mutations.post('/super-admin/exam-bookings/:id/reject', requireRole('super_admin'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const body = await bodyJson(c)
  const comments = String(body.comments || '').trim()
  const { data: booking } = await db.from('exam_bookings').select('*').eq('id', id).maybeSingle()
  if (!booking) return err(c, 'Booking not found.', 404)
  if ((booking as Row).status !== 'pending') return err(c, 'Only pending bookings can be updated.', 400)
  await db
    .from('exam_bookings')
    .update({ status: 'rejected', approved_by: user.id, approved_at: nowIso(), comments: comments || null })
    .eq('id', id)
  writeAuditLog(c, 'rejected_exam_booking', `booking:${id}`)
  return ok(c, { rejected: true })
})

/* ── Industry mentor approvals ───────────────────────────────────────────── */

async function mentorCompanyId(db: ReturnType<typeof getServiceClient>, userId: string) {
  const { data } = await db.from('mentors').select('company_id').eq('user_id', userId).maybeSingle()
  return (data as Row | null)?.company_id as string | undefined
}

mutations.post('/industry-mentor/logbook/:id/approve', requireRole('industry_mentor'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const companyId = await mentorCompanyId(db, user.id)
  if (!companyId) return err(c, 'Mentor profile not found.', 404)

  const { data: log } = await db.from('digital_logbook').select('*').eq('id', id).maybeSingle()
  if (!log) return err(c, 'Logbook entry not found.', 404)

  const { data: att } = await db
    .from('industrial_attachments')
    .select('company_id')
    .eq('id', (log as Row).attachment_id as string)
    .maybeSingle()
  if ((att as Row | null)?.company_id !== companyId) return err(c, 'Forbidden.', 403)

  await db
    .from('digital_logbook')
    .update({
      mentor_approval_status: 'approved',
      mentor_approved_by: user.id,
      mentor_approved_at: nowIso(),
    })
    .eq('id', id)

  writeAuditLog(c, 'approve_logbook', `logbook:${id}`)
  return ok(c, { approved: true })
})

mutations.post('/industry-mentor/logbook/:id/reject', requireRole('industry_mentor'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const body = await bodyJson(c)
  const comments = String(body.comments || '').trim()
  const companyId = await mentorCompanyId(db, user.id)
  if (!companyId) return err(c, 'Mentor profile not found.', 404)

  const { data: log } = await db.from('digital_logbook').select('*').eq('id', id).maybeSingle()
  if (!log) return err(c, 'Logbook entry not found.', 404)

  const { data: att } = await db
    .from('industrial_attachments')
    .select('company_id')
    .eq('id', (log as Row).attachment_id as string)
    .maybeSingle()
  if ((att as Row | null)?.company_id !== companyId) return err(c, 'Forbidden.', 403)

  await db
    .from('digital_logbook')
    .update({
      mentor_approval_status: 'rejected',
      mentor_comments: comments || null,
      mentor_approved_by: user.id,
      mentor_approved_at: nowIso(),
    })
    .eq('id', id)

  writeAuditLog(c, 'reject_logbook', `logbook:${id}`)
  return ok(c, { rejected: true })
})

mutations.post('/industry-mentor/competency/:id/verify', requireRole('industry_mentor'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const body = await bodyJson(c)
  const status = String(body.status || 'competent').trim()
  const companyId = await mentorCompanyId(db, user.id)
  if (!companyId) return err(c, 'Mentor profile not found.', 404)

  const { data: row } = await db.from('competency_tracking').select('*').eq('id', id).maybeSingle()
  if (!row) return err(c, 'Competency record not found.', 404)

  const { data: att } = await db
    .from('industrial_attachments')
    .select('company_id')
    .eq('id', (row as Row).attachment_id as string)
    .maybeSingle()
  if ((att as Row | null)?.company_id !== companyId) return err(c, 'Forbidden.', 403)

  await db
    .from('competency_tracking')
    .update({
      verification_status: 'verified',
      competency_status: status,
      verified_by: user.id,
      verified_at: nowIso(),
      mentor_comments: String(body.comments || '').trim() || null,
    })
    .eq('id', id)

  writeAuditLog(c, 'verify_competency', `competency:${id}`)
  return ok(c, { verified: true })
})

/* ── Liaison attachment approval ─────────────────────────────────────────── */

mutations.post('/liaison-officer/attachments/:id/approve', requireRole('liaison_officer'), async (c) => {
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const { data } = await db.from('industrial_attachments').select('*').eq('id', id).maybeSingle()
  if (!data) return err(c, 'Attachment not found.', 404)

  await db
    .from('industrial_attachments')
    .update({ status: 'active', approved_at: nowIso(), approved_by: c.get('user').id })
    .eq('id', id)

  const studentId = (data as Row).student_id as string
  if (studentId) {
    await db.from('notifications').insert({
      user_id: studentId,
      title: 'Attachment approved',
      message: 'Your industrial attachment placement was approved by the liaison office.',
      notification_type: 'success',
      action_url: '/student/industrial-attachment',
      is_read: false,
    })
  }

  writeAuditLog(c, 'approve_attachment', `attachment:${id}`)
  return ok(c, { approved: true })
})

mutations.post('/liaison-officer/attachments/:id/reject', requireRole('liaison_officer'), async (c) => {
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const body = await bodyJson(c)
  const comments = String(body.comments || '').trim()

  const { data } = await db.from('industrial_attachments').select('*').eq('id', id).maybeSingle()
  if (!data) return err(c, 'Attachment not found.', 404)

  await db
    .from('industrial_attachments')
    .update({ status: 'rejected', comments: comments || null })
    .eq('id', id)

  writeAuditLog(c, 'reject_attachment', `attachment:${id}`)
  return ok(c, { rejected: true })
})

/* ── Student industrial attachment + logbook ─────────────────────────────── */

mutations.post('/student/industrial-attachment/request', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)

  const companyName = String(body.company_name || '').trim()
  const industryRaw = String(body.industry || 'Other').trim()
  const industry = (INDUSTRIES as readonly string[]).includes(industryRaw) ? industryRaw : 'Other'
  const companyDepartment = String(body.company_department || '').trim()
  const companyAddress = String(body.company_address || '').trim()
  const county = String(body.county || '').trim()
  const town = String(body.town || '').trim()
  const companyEmail = String(body.company_email || '').trim()
  const companyPhone = String(body.company_phone || '').trim()
  const website = String(body.website || '').trim()
  const supervisorName = String(body.supervisor_name || '').trim()
  const supervisorPosition = String(body.supervisor_position || '').trim()
  const supervisorContact = String(body.supervisor_contact || '').trim()
  const supervisorEmail = String(body.supervisor_email || '').trim()
  const attachmentTerm = String(body.attachment_term || '').trim()
  const yearInt = Number(body.attachment_year) || new Date().getFullYear()
  const startDate = String(body.start_date || '').trim()
  const endDate = String(body.end_date || '').trim()
  const expectedHours = String(body.expected_working_hours || '').trim()
  const mobileNumber = String(body.mobile_number || '').trim()
  const latitude = body.latitude !== undefined && body.latitude !== '' ? Number(body.latitude) : null
  const longitude = body.longitude !== undefined && body.longitude !== '' ? Number(body.longitude) : null

  if (
    !companyName ||
    !companyAddress ||
    !county ||
    !town ||
    !supervisorName ||
    !supervisorPosition ||
    !supervisorContact ||
    !attachmentTerm ||
    !startDate ||
    !endDate
  ) {
    return err(c, 'Please complete all required placement fields.', 400)
  }

  const acceptance = (body.acceptance_letter as Row | undefined) || null
  if (!acceptance?.file_base64 || !acceptance?.file_name) {
    return err(c, 'Upload the company acceptance letter before submitting.', 400)
  }

  const gate = await studentCanSubmitPlacement(db, user.id, attachmentTerm, yearInt)
  if (!gate.allowed) return err(c, gate.message, 400)
  const periodId = gate.period?.id ? String(gate.period.id) : null

  const base = c.env.SUPABASE_URL.replace(/\/$/, '')

  async function uploadDoc(file: Row, label: string) {
    const fileName = String(file.file_name || 'doc.bin')
    const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : 'bin'
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) throw new Error(`${label} must be PDF/JPG/PNG.`)
    const bytes = decodeBase64Payload(String(file.file_base64 || ''))
    const storagePath = `industrial_attachment_letters/${user.id}/${crypto.randomUUID()}_${fileSlug(label)}.${ext}`
    await uploadBytes(db, 'assessment-scripts', storagePath, bytes, String(file.content_type || 'application/octet-stream'))
    return {
      url: `${base}/storage/v1/object/public/assessment-scripts/${storagePath}`,
      path: storagePath,
      name: fileName,
    }
  }

  try {
    const letter = await uploadDoc(acceptance, companyName)
    const docUrls: Record<string, string> = {}
    for (const key of ['offer_letter', 'introduction_letter', 'company_stamp', 'signed_acceptance_form'] as const) {
      const f = body[key] as Row | undefined
      if (f?.file_base64 && f?.file_name) {
        const up = await uploadDoc(f, key)
        docUrls[`${key}_url`] = up.url
      }
    }

    const companyPayload: Record<string, unknown> = {
      name: companyName,
      industry_classification: industry,
      address: companyAddress,
      city: town,
      county,
      email: companyEmail || null,
      phone_number: companyPhone || null,
      website: website || null,
      company_department: companyDepartment || null,
      contact_person: supervisorName,
      contact_phone: supervisorContact,
      contact_email: supervisorEmail || null,
      is_active: true,
      available_slots: 1,
      created_by: user.id,
    }
    if (latitude != null && !Number.isNaN(latitude)) companyPayload.latitude = latitude
    if (longitude != null && !Number.isNaN(longitude)) companyPayload.longitude = longitude

    let companyData = { ...companyPayload }
    let companyId = ''
    for (let i = 0; i < 10; i++) {
      const { data, error } = await db.from('companies').insert(companyData).select('id').single()
      if (!error && data) {
        companyId = String((data as Row).id)
        break
      }
      const msg = error?.message || ''
      const unknownCol = msg.match(/'(\w+)' column/) || msg.match(/Could not find the '(\w+)' column/)
      if (unknownCol) {
        delete companyData[unknownCol[1]]
        continue
      }
      return err(c, msg || 'Could not create company.', 400)
    }
    if (!companyId) return err(c, 'Could not create company.', 400)

    if (mobileNumber) {
      await db.from('user_profiles').update({ mobile_number: mobileNumber }).eq('id', user.id)
    }

    const attPayload: Record<string, unknown> = {
      student_id: user.id,
      company_id: companyId,
      start_date: startDate,
      end_date: endDate,
      status: 'pending',
      placement_status: 'pending_verification',
      created_by: user.id,
      acceptance_letter_url: letter.url,
      acceptance_letter_name: letter.name,
      acceptance_letter_path: letter.path,
      acceptance_letter_status: 'pending',
      supervisor_email: supervisorEmail || null,
      supervisor_position: supervisorPosition,
      expected_working_hours: expectedHours || null,
      placement_details: {
        county,
        town,
        company_department: companyDepartment,
        expected_working_hours: expectedHours,
        workflow: 'placement_first_v1',
      },
      attachment_term: attachmentTerm,
      attachment_year: yearInt,
      ...docUrls,
    }
    if (periodId) attPayload.period_id = periodId

    let attData = { ...attPayload }
    let inserted = false
    for (let i = 0; i < 15 && !inserted; i++) {
      const { error } = await db.from('industrial_attachments').insert(attData)
      if (!error) {
        inserted = true
        break
      }
      const msg = error.message || ''
      const unknownCol = msg.match(/'(\w+)' column/) || msg.match(/Could not find the '(\w+)' column/)
      if (unknownCol) {
        delete attData[unknownCol[1]]
        continue
      }
      return err(c, msg, 400)
    }
    if (!inserted) return err(c, 'Could not submit placement.', 400)

    const { data: officers } = await db.from('user_profiles').select('id').eq('role', 'liaison_officer')
    for (const officer of (officers ?? []) as Row[]) {
      await db.from('notifications').insert({
        user_id: officer.id,
        title: 'New Placement Submission',
        message: `${user.full_name || 'A trainee'} submitted placement details for ${companyName}.`,
        notification_type: 'info',
        action_url: '/liaison-officer/attachments?status=pending',
      })
    }

    writeAuditLog(c, 'submit_placement', `company:${companyId}`)
    return ok(c, { submitted: true, company_id: companyId })
  } catch (e) {
    return err(c, e instanceof Error ? e.message : 'Error submitting placement.', 400)
  }
})

mutations.post('/student/industrial-attachment/:id/delete', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const { data: rows } = await db
    .from('industrial_attachments')
    .select('id, status, company_id, created_by, acceptance_letter_path')
    .eq('id', id)
    .eq('student_id', user.id)
    .limit(1)
  const att = ((rows ?? []) as Row[])[0]
  if (!att) return err(c, 'Attachment not found.', 404)
  if (String(att.status) !== 'pending') return err(c, 'Only submitted (pending) attachments can be deleted.', 400)

  await db.from('industrial_attachments').delete().eq('id', id)
  if (att.company_id) {
    await db.from('companies').delete().eq('id', att.company_id as string).eq('created_by', user.id)
  }
  writeAuditLog(c, 'delete_attachment', `attachment:${id}`)
  return ok(c, { deleted: true })
})

mutations.post('/student/check-in', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const attachmentId = String(body.attachment_id || '').trim()
  const latitude = Number(body.latitude)
  const longitude = Number(body.longitude)
  if (!attachmentId || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return err(c, 'Attachment ID and location coordinates are required.', 400)
  }

  const { data: attachment } = await db
    .from('industrial_attachments')
    .select('*, companies(latitude, longitude, geofence_radius_meters)')
    .eq('id', attachmentId)
    .eq('student_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!attachment) return err(c, 'Active attachment not found.', 404)

  const company = ((attachment as Row).companies as Row) || {}
  const companyLat = Number(company.latitude)
  const companyLon = Number(company.longitude)
  const radius = Number(company.geofence_radius_meters) || 300
  let isWithin = true
  let distance = 0
  if (!Number.isNaN(companyLat) && !Number.isNaN(companyLon)) {
    distance = haversineMeters(latitude, longitude, companyLat, companyLon)
    isWithin = distance <= radius
  }

  const { data: activeLog } = await db
    .from('location_logs')
    .select('id')
    .eq('student_id', user.id)
    .eq('attachment_id', attachmentId)
    .is('check_out_time', null)
    .limit(1)
  if ((activeLog ?? []).length) return err(c, 'You already have an active check-in. Please check-out first.', 400)

  const { error } = await db.from('location_logs').insert({
    student_id: user.id,
    attachment_id: attachmentId,
    latitude,
    longitude,
    accuracy_meters: body.accuracy_meters != null ? Number(body.accuracy_meters) : null,
    is_within_geofence: isWithin,
    location_method: String(body.location_method || 'gps'),
    device_info: String(body.device_info || ''),
  })
  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'check_in', `attachment:${attachmentId}`)
  return ok(c, { checked_in: true, is_within_geofence: isWithin, distance_meters: Math.round(distance) })
})

mutations.post('/student/check-out', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const attachmentId = String(body.attachment_id || '').trim()
  if (!attachmentId) return err(c, 'Attachment ID is required.', 400)

  const { data: attachment } = await db
    .from('industrial_attachments')
    .select('id')
    .eq('id', attachmentId)
    .eq('student_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!attachment) return err(c, 'Active attachment not found.', 404)

  const { data: logs } = await db
    .from('location_logs')
    .select('id')
    .eq('student_id', user.id)
    .eq('attachment_id', attachmentId)
    .is('check_out_time', null)
    .order('check_in_time', { ascending: false })
    .limit(1)
  const open = ((logs ?? []) as Row[])[0]
  if (!open) return err(c, 'No active check-in found.', 400)

  const { error } = await db
    .from('location_logs')
    .update({ check_out_time: nowIso() })
    .eq('id', open.id as string)
  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'check_out', `attachment:${attachmentId}`)
  return ok(c, { checked_out: true })
})

mutations.post('/student/logbook', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)

  // New Form fields (Flask logbook/add)
  const tasksPerformed = String(body.tasks_performed || body.activities || '').trim()
  const logDate = String(body.log_date || body.entry_date || nowIso().slice(0, 10)).trim()
  const entryTime = String(body.entry_time || '').trim()
  const skillsApplied = String(body.skills_applied || '').trim()
  const challenges = String(body.challenges_encountered || '').trim()
  const achievements = String(body.achievements || '').trim()
  const knownSlots = new Set(['08:00-11:00', '11:00-14:00', '14:00-17:00', '17:00-20:00'])
  const hoursWorked = knownSlots.has(entryTime) ? 3 : body.week_number ? null : null

  if (!tasksPerformed) return err(c, 'Date, time slot, and activity description are required.', 400)
  if (entryTime && !logDate) return err(c, 'Date, time slot, and activity description are required.', 400)

  let attId = String(body.attachment_id || '').trim()
  if (!attId) {
    const { data: att } = await db
      .from('industrial_attachments')
      .select('id')
      .eq('student_id', user.id)
      .in('status', ['active', 'approved', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    attId = String((att as Row | null)?.id || '')
  }
  if (!attId) return err(c, 'No active attachment found for logbook entry.', 400)

  if (entryTime && !knownSlots.has(entryTime) && !body.activities) {
    return err(c, 'Select a valid 3-hour time slot.', 400)
  }
  if (entryTime && !tasksPerformed) {
    return err(c, 'Date, time slot, and activity description are required.', 400)
  }

  const evidencePaths: string[] = []
  const files = Array.isArray(body.evidence) ? (body.evidence as Row[]) : []
  for (const file of files) {
    const fileName = String(file.file_name || '').trim()
    const b64 = String(file.file_base64 || '').trim()
    if (!fileName || !b64) continue
    const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : ''
    if (
      !['jpg', 'jpeg', 'png', 'webp', 'pdf', 'mp4', 'mov', 'avi', 'webm', 'mp3', 'wav', 'ogg', 'm4a'].includes(ext)
    ) {
      continue
    }
    const storagePath = `logbook/${user.id}_${crypto.randomUUID().replace(/-/g, '')}.${ext}`
    const bytes = decodeBase64Payload(b64)
    await uploadBytes(db, 'assessment-evidence', storagePath, bytes, String(file.content_type || 'application/octet-stream'))
    evidencePaths.push(storagePath)
  }

  // Prefer Flask-shaped insert; fall back to legacy columns if schema drifts
  const payload: Record<string, unknown> = {
    student_id: user.id,
    attachment_id: attId,
    log_date: logDate,
    entry_time: entryTime || null,
    tasks_performed: tasksPerformed,
    skills_applied: skillsApplied || null,
    hours_worked: hoursWorked,
    challenges_encountered: challenges || null,
    achievements: achievements || null,
    evidence_urls: evidencePaths.length ? evidencePaths : null,
    // legacy InteractiveTablePage fields
    week_number: Number(body.week_number) || null,
    activities: tasksPerformed,
    entry_date: logDate,
    mentor_approval_status: 'pending',
  }

  let data = { ...payload }
  for (let i = 0; i < 15; i++) {
    const { data: row, error } = await db.from('digital_logbook').insert(data).select('id').single()
    if (!error && row) {
      writeAuditLog(c, 'add_logbook', `logbook:${(row as Row).id}`)
      return ok(c, { id: (row as Row).id })
    }
    const msg = error?.message || ''
    const unknownCol = msg.match(/'(\w+)' column/) || msg.match(/Could not find the '(\w+)' column/)
    if (unknownCol) {
      delete data[unknownCol[1]]
      continue
    }
    return err(c, msg || 'Could not add logbook entry.', 400)
  }
  return err(c, 'Could not add logbook entry.', 400)
})

/* ── Student employment ──────────────────────────────────────────────────── */

mutations.post('/student/employment-status', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const employerName = String(body.employer_name || '').trim()
  const position = String(body.position || '').trim()
  const status = String(body.status || 'employed').trim()

  if (!employerName) return err(c, 'Employer name is required.', 400)

  const { data, error } = await db
    .from('employment_tracking')
    .insert({
      student_id: user.id,
      employer_name: employerName,
      position: position || null,
      status,
      start_date: String(body.start_date || '').trim() || null,
    })
    .select('id')
    .single()

  if (error) return err(c, error.message, 400)
  return ok(c, { id: (data as Row).id })
})

/* ── Workshop inventory ──────────────────────────────────────────────────── */

mutations.post('/workshop-technician/inventory', requireRole('workshop_technician'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const itemName = String(body.item_name || '').trim()
  if (!itemName) return err(c, 'Item name is required.', 400)
  if (!user.department_id) return err(c, 'Department not assigned.', 400)

  const { data, error } = await db
    .from('workshop_inventory')
    .insert({
      department_id: user.department_id,
      item_name: itemName,
      category: String(body.category || 'general').trim(),
      quantity: Number(body.quantity) || 1,
      condition: String(body.condition || 'good').trim(),
      location: String(body.location || '').trim() || null,
      serial_number: String(body.serial_number || '').trim() || null,
      notes: String(body.notes || '').trim() || null,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'add_inventory_item', `item:${(data as Row).id}`)
  return ok(c, { item: data })
})

mutations.patch('/workshop-technician/inventory/:id', requireRole('workshop_technician'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const body = await bodyJson(c)

  const { data: existing } = await db.from('workshop_inventory').select('*').eq('id', id).maybeSingle()
  if (!existing) return err(c, 'Item not found.', 404)
  if (!deptIsolationCheck(user, (existing as Row).department_id as string)) {
    return err(c, 'Forbidden.', 403)
  }

  const patch: Row = {}
  for (const key of ['item_name', 'category', 'condition', 'location', 'serial_number', 'notes'] as const) {
    if (body[key] !== undefined) patch[key] = String(body[key] || '').trim() || null
  }
  if (body.quantity !== undefined) patch.quantity = Number(body.quantity) || 0

  await db.from('workshop_inventory').update(patch).eq('id', id)
  writeAuditLog(c, 'update_inventory_item', `item:${id}`)
  return ok(c, { updated: true })
})

mutations.delete('/workshop-technician/inventory/:id', requireRole('workshop_technician'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const { data: existing } = await db.from('workshop_inventory').select('*').eq('id', id).maybeSingle()
  if (!existing) return err(c, 'Item not found.', 404)
  if (!deptIsolationCheck(user, (existing as Row).department_id as string)) {
    return err(c, 'Forbidden.', 403)
  }
  await db.from('workshop_inventory').delete().eq('id', id)
  writeAuditLog(c, 'delete_inventory_item', `item:${id}`)
  return ok(c, { deleted: true })
})

/* ── Super admin resource CRUD ───────────────────────────────────────────── */

mutations.post('/super-admin/departments', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const name = String(body.name || '').trim().toUpperCase()
  const code = String(body.code || '').trim().toUpperCase()
  if (!name || !code) return err(c, 'Department name and code are required.', 400)

  const { data: existing } = await db.from('departments').select('id').eq('name', name).maybeSingle()
  if (existing) return err(c, 'Department already exists.', 400)

  const { data, error } = await db.from('departments').insert({ name, code }).select('*').single()
  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'create_department', name)
  return ok(c, { item: data })
})

mutations.delete('/super-admin/departments/:id', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  await db.from('course_applications').update({ department_id: null }).eq('department_id', id)
  const { error } = await db.from('departments').delete().eq('id', id)
  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'delete_department', id)
  return ok(c, { deleted: true })
})

mutations.post('/super-admin/courses', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const name = String(body.name || '').trim()
  const code = String(body.code || '').trim().toUpperCase()
  const departmentId = String(body.department_id || '').trim()
  if (!name || !code || !departmentId) return err(c, 'Name, code and department are required.', 400)

  const { data, error } = await db
    .from('courses')
    .insert({
      name,
      code,
      department_id: departmentId,
      level: String(body.level || '').trim() || null,
      duration_months: Number(body.duration_months) || null,
    })
    .select('*')
    .single()
  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'create_course', code)
  return ok(c, { item: data })
})

mutations.delete('/super-admin/courses/:id', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const { error } = await db.from('courses').delete().eq('id', id)
  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'delete_course', id)
  return ok(c, { deleted: true })
})

mutations.post('/super-admin/classes', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const name = String(body.name || '').trim()
  const departmentId = String(body.department_id || '').trim()
  const courseId = String(body.course_id || '').trim() || null
  if (!name || !departmentId) return err(c, 'Class name and department are required.', 400)

  const { data, error } = await db
    .from('classes')
    .insert({
      name,
      department_id: departmentId,
      course_id: courseId,
      year: Number(body.year) || new Date().getFullYear(),
      intake: String(body.intake || '').trim() || null,
    })
    .select('*')
    .single()
  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'create_class', name)
  return ok(c, { item: data })
})

mutations.delete('/super-admin/classes/:id', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const { error } = await db.from('classes').delete().eq('id', id)
  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'delete_class', id)
  return ok(c, { deleted: true })
})

mutations.post('/super-admin/units', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const name = String(body.name || '').trim()
  const code = String(body.code || '').trim().toUpperCase()
  const departmentId = String(body.department_id || '').trim()
  if (!name || !code || !departmentId) return err(c, 'Name, code and department are required.', 400)

  const { data, error } = await db
    .from('units')
    .insert({
      name,
      code,
      department_id: departmentId,
      credit_hours: Number(body.credit_hours) || null,
    })
    .select('*')
    .single()
  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'create_unit', code)
  return ok(c, { item: data })
})

mutations.delete('/super-admin/units/:id', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const { error } = await db.from('units').delete().eq('id', id)
  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'delete_unit', id)
  return ok(c, { deleted: true })
})

mutations.post('/super-admin/users', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const email = String(body.email || '').trim().toLowerCase()
  const fullName = String(body.full_name || '').trim()
  const role = String(body.role || '').trim()
  const password = String(body.password || '').trim() || genTempPassword()
  const departmentId = String(body.department_id || '').trim() || null
  const admissionNo = String(body.admission_no || '').trim() || null
  const staffNo = String(body.staff_no || '').trim() || null
  const mobile = String(body.mobile_number || '').trim() || null

  if (!email || !fullName || !role) return err(c, 'Full name, email and role are required.', 400)
  if (password.length < 8) return err(c, 'Password must be at least 8 characters.', 400)
  if (role === 'student' && !admissionNo) return err(c, 'Admission number is required for students.', 400)

  const { data: existing } = await db.from('user_profiles').select('id').eq('email', email).maybeSingle()
  if (existing) return err(c, 'An account with this email already exists.', 400)

  let userId: string

  if (role === 'student') {
    const { data: dup } = await db
      .from('user_profiles')
      .select('id')
      .eq('admission_no', admissionNo)
      .maybeSingle()
    if (dup) return err(c, 'Admission number already exists.', 400)

    const created = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { admission_no: admissionNo },
    })
    userId = created.data.user?.id || crypto.randomUUID()
    if (created.error && !created.data.user) {
      // Fall back to local UUID if Auth create fails (mirrors Flask warning path).
      userId = crypto.randomUUID()
    }

    const hash = await generateWerkzeugHash(password)
    const { error } = await db.from('user_profiles').insert({
      id: userId,
      email,
      full_name: fullName,
      role: 'student',
      admission_no: admissionNo,
      department_id: departmentId,
      password_hash: hash,
      mobile_number: mobile,
      is_active: true,
      must_change_password: true,
    })
    if (error) return err(c, error.message, 400)
  } else {
    if (!STAFF_ROLES.has(role) && role !== 'student') {
      return err(c, `Invalid role: ${role}`, 400)
    }
    const created = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    })
    if (created.error || !created.data.user) {
      return err(c, created.error?.message || 'Could not create staff auth user.', 400)
    }
    userId = created.data.user.id
    const { error } = await db.from('user_profiles').insert({
      id: userId,
      email,
      full_name: fullName,
      role,
      department_id: departmentId,
      staff_no: staffNo,
      mobile_number: mobile,
      is_active: true,
      must_change_password: true,
    })
    if (error) return err(c, error.message, 400)
  }

  writeAuditLog(c, 'create_user', `user:${userId}`)
  return ok(c, {
    user_id: userId,
    credentials: { email, password, full_name: fullName, role },
  })
})

mutations.patch('/super-admin/users/:id', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const body = await bodyJson(c)
  const patch: Row = {}
  if (body.full_name !== undefined) patch.full_name = String(body.full_name || '').trim()
  if (body.role !== undefined) patch.role = String(body.role || '').trim()
  if (body.department_id !== undefined) patch.department_id = String(body.department_id || '').trim() || null
  if (body.is_active !== undefined) patch.is_active = Boolean(body.is_active)
  if (body.staff_no !== undefined) patch.staff_no = String(body.staff_no || '').trim() || null
  if (body.mobile_number !== undefined) patch.mobile_number = String(body.mobile_number || '').trim() || null

  const { error } = await db.from('user_profiles').update(patch).eq('id', id)
  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'update_user', `user:${id}`)
  return ok(c, { updated: true })
})

mutations.delete('/super-admin/users/:id', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  if (id === c.get('user').id) return err(c, 'You cannot delete your own account.', 400)

  await db.from('user_profiles').update({ is_active: false }).eq('id', id)
  try {
    await db.auth.admin.deleteUser(id)
  } catch {
    /* profile soft-deactivated even if Auth delete fails */
  }
  writeAuditLog(c, 'delete_user', `user:${id}`)
  return ok(c, { deleted: true })
})

mutations.post('/super-admin/users/:id/reset-password', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const body = await bodyJson(c)
  const password = String(body.password || '').trim() || genTempPassword()
  if (password.length < 8) return err(c, 'Password must be at least 8 characters.', 400)

  const { data: profile } = await db.from('user_profiles').select('role').eq('id', id).maybeSingle()
  if (!profile) return err(c, 'User not found.', 404)

  if ((profile as Row).role === 'student') {
    const hash = await generateWerkzeugHash(password)
    await db
      .from('user_profiles')
      .update({ password_hash: hash, must_change_password: true })
      .eq('id', id)
  } else {
    const { error } = await db.auth.admin.updateUserById(id, { password })
    if (error) return err(c, error.message, 400)
    await db.from('user_profiles').update({ must_change_password: true }).eq('id', id)
  }

  writeAuditLog(c, 'reset_password', `user:${id}`)
  return ok(c, { password })
})

mutations.post('/super-admin/companies', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const name = String(body.name || '').trim()
  if (!name) return err(c, 'Company name is required.', 400)
  const { data, error } = await db
    .from('companies')
    .insert({
      name,
      address: String(body.address || '').trim() || null,
      contact_person: String(body.contact_person || '').trim() || null,
      contact_phone: String(body.contact_phone || '').trim() || null,
      contact_email: String(body.contact_email || '').trim() || null,
    })
    .select('*')
    .single()
  if (error) return err(c, error.message, 400)
  return ok(c, { item: data })
})

mutations.delete('/super-admin/companies/:id', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { error } = await db.from('companies').delete().eq('id', c.req.param('id'))
  if (error) return err(c, error.message, 400)
  return ok(c, { deleted: true })
})

mutations.post('/super-admin/notices', requireRole('super_admin'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const title = String(body.title || '').trim()
  const message = String(body.message || '').trim()
  if (!title || !message) return err(c, 'Title and message are required.', 400)

  const { data, error } = await db
    .from('dept_notices')
    .insert({
      title,
      message,
      created_by: user.id,
      target_role: String(body.target_role || '').trim() || null,
      department_id: String(body.department_id || '').trim() || null,
      is_active: true,
    })
    .select('*')
    .single()
  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'create_notice', `notice:${(data as Row).id}`)
  return ok(c, { item: data })
})

mutations.delete('/super-admin/notices/:id', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { error } = await db.from('dept_notices').delete().eq('id', c.req.param('id'))
  if (error) return err(c, error.message, 400)
  return ok(c, { deleted: true })
})

mutations.post('/super-admin/biometric-scanners', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const name = String(body.name || '').trim()
  const deviceId = String(body.device_id || '').trim()
  if (!name || !deviceId) return err(c, 'Name and device ID are required.', 400)

  const { data, error } = await db
    .from('biometric_scanners')
    .insert({
      name,
      device_id: deviceId,
      location: String(body.location || '').trim() || null,
      department_id: String(body.department_id || '').trim() || null,
      is_active: true,
    })
    .select('*')
    .single()
  if (error) return err(c, error.message, 400)
  return ok(c, { item: data })
})

mutations.delete('/super-admin/biometric-scanners/:id', requireRole('super_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { error } = await db.from('biometric_scanners').delete().eq('id', c.req.param('id'))
  if (error) return err(c, error.message, 400)
  return ok(c, { deleted: true })
})

/* ── Dept admin mutations ────────────────────────────────────────────────── */

mutations.post('/dept-admin/classes', requireRole('dept_admin'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const name = String(body.name || '').trim()
  const courseId = String(body.course_id || '').trim()
  if (!user.department_id) return err(c, 'Department not assigned.', 400)
  if (!name || !courseId) return err(c, 'Class name and course are required.', 400)

  const { data: course } = await db
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('department_id', user.department_id)
    .maybeSingle()
  if (!course) return err(c, 'Course does not belong to your department.', 400)

  const { data, error } = await db
    .from('classes')
    .insert({
      name,
      course_id: courseId,
      department_id: user.department_id,
      year: Number(body.year) || new Date().getFullYear(),
      intake: String(body.intake || '').trim() || null,
    })
    .select('*')
    .single()
  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'create_class', `class:${(data as Row).id}`)
  return ok(c, { item: data })
})

mutations.post('/dept-admin/units', requireRole('dept_admin'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const name = String(body.name || '').trim()
  const code = String(body.code || '').trim().toUpperCase()
  if (!user.department_id) return err(c, 'Department not assigned.', 400)
  if (!name || !code) return err(c, 'Unit name and code are required.', 400)

  const { data, error } = await db
    .from('units')
    .insert({
      name,
      code,
      department_id: user.department_id,
      credit_hours: Number(body.credit_hours) || null,
    })
    .select('*')
    .single()
  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'create_unit', `unit:${(data as Row).id}`)
  return ok(c, { item: data })
})

mutations.post('/dept-admin/students', requireRole('dept_admin'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const email = String(body.email || '').trim().toLowerCase()
  const fullName = String(body.full_name || '').trim()
  const password = String(body.password || '').trim() || genTempPassword()
  const admissionNo = String(body.admission_no || '').trim()
  const mobile = String(body.mobile_number || '').trim() || null
  if (!user.department_id) return err(c, 'Department not assigned.', 400)
  if (!email || !fullName || !admissionNo) {
    return err(c, 'Full name, email and admission number are required.', 400)
  }
  if (password.length < 8) return err(c, 'Password must be at least 8 characters.', 400)

  const { data: existing } = await db.from('user_profiles').select('id').eq('email', email).maybeSingle()
  if (existing) return err(c, 'An account with this email already exists.', 400)
  const { data: duplicateAdmission } = await db
    .from('user_profiles')
    .select('id')
    .eq('admission_no', admissionNo)
    .maybeSingle()
  if (duplicateAdmission) return err(c, 'Admission number already exists.', 400)

  const created = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { admission_no: admissionNo },
  })
  let userId = created.data.user?.id || crypto.randomUUID()
  if (created.error && !created.data.user) userId = crypto.randomUUID()

  const hash = await generateWerkzeugHash(password)
  const { error } = await db.from('user_profiles').insert({
    id: userId,
    email,
    full_name: fullName,
    role: 'student',
    admission_no: admissionNo,
    department_id: user.department_id,
    password_hash: hash,
    mobile_number: mobile,
    is_active: true,
    must_change_password: true,
  })
  if (error) return err(c, error.message, 400)

  writeAuditLog(c, 'create_user', `user:${userId}`)
  return ok(c, {
    user_id: userId,
    credentials: { email, password, full_name: fullName, role: 'student' },
  })
})

mutations.post('/dept-admin/trainers', requireRole('dept_admin'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const email = String(body.email || '').trim().toLowerCase()
  const fullName = String(body.full_name || '').trim()
  const password = String(body.password || '').trim() || genTempPassword()
  const staffNo = String(body.staff_no || '').trim() || null
  const mobile = String(body.mobile_number || '').trim() || null
  if (!user.department_id) return err(c, 'Department not assigned.', 400)
  if (!email || !fullName) return err(c, 'Full name and email are required.', 400)
  if (password.length < 8) return err(c, 'Password must be at least 8 characters.', 400)

  const { data: existing } = await db.from('user_profiles').select('id').eq('email', email).maybeSingle()
  if (existing) return err(c, 'An account with this email already exists.', 400)

  const created = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: 'trainer' },
  })
  if (created.error || !created.data.user) {
    return err(c, created.error?.message || 'Could not create trainer auth user.', 400)
  }

  const userId = created.data.user.id
  const { error } = await db.from('user_profiles').insert({
    id: userId,
    email,
    full_name: fullName,
    role: 'trainer',
    department_id: user.department_id,
    staff_no: staffNo,
    mobile_number: mobile,
    is_active: true,
    must_change_password: true,
  })
  if (error) return err(c, error.message, 400)

  writeAuditLog(c, 'create_user', `user:${userId}`)
  return ok(c, {
    user_id: userId,
    credentials: { email, password, full_name: fullName, role: 'trainer' },
  })
})

mutations.post('/dept-admin/companies', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const name = String(body.name || '').trim()
  if (!name) return err(c, 'Company name is required.', 400)
  const { data, error } = await db
    .from('companies')
    .insert({
      name,
      address: String(body.address || '').trim() || null,
      contact_person: String(body.contact_person || '').trim() || null,
      contact_phone: String(body.contact_phone || '').trim() || null,
      contact_email: String(body.contact_email || '').trim() || null,
      department_id: c.get('user').department_id,
    })
    .select('*')
    .single()
  if (error) return err(c, error.message, 400)
  return ok(c, { item: data })
})

mutations.delete('/dept-admin/companies/:id', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { error } = await db.from('companies').delete().eq('id', c.req.param('id'))
  if (error) return err(c, error.message, 400)
  return ok(c, { deleted: true })
})

mutations.post('/dept-admin/notices', requireRole('dept_admin'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const title = String(body.title || '').trim()
  const message = String(body.message || '').trim()
  if (!title || !message) return err(c, 'Title and message are required.', 400)
  if (!user.department_id) return err(c, 'Department not assigned.', 400)

  const { data, error } = await db
    .from('dept_notices')
    .insert({
      title,
      message,
      created_by: user.id,
      department_id: user.department_id,
      target_role: String(body.target_role || '').trim() || null,
      is_active: true,
    })
    .select('*')
    .single()
  if (error) return err(c, error.message, 400)
  return ok(c, { item: data })
})

mutations.delete('/dept-admin/notices/:id', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { error } = await db.from('dept_notices').delete().eq('id', c.req.param('id'))
  if (error) return err(c, error.message, 400)
  return ok(c, { deleted: true })
})

mutations.post('/dept-admin/assign-units', requireRole('dept_admin'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const trainerId = String(body.trainer_id || '').trim()
  const unitId = String(body.unit_id || '').trim()
  const classId = String(body.class_id || '').trim() || null
  if (!trainerId || !unitId) return err(c, 'Trainer and unit are required.', 400)

  const { data, error } = await db
    .from('trainer_units')
    .insert({
      trainer_id: trainerId,
      unit_id: unitId,
      class_id: classId,
      department_id: user.department_id,
    })
    .select('*')
    .single()
  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'assign_unit', `trainer:${trainerId}:unit:${unitId}`)
  return ok(c, { item: data })
})

mutations.delete('/dept-admin/assign-units/:id', requireRole('dept_admin'), async (c) => {
  const db = getServiceClient(c.env)
  const { error } = await db.from('trainer_units').delete().eq('id', c.req.param('id'))
  if (error) return err(c, error.message, 400)
  return ok(c, { deleted: true })
})

/* ── Summative ───────────────────────────────────────────────────────────── */

mutations.get('/summative/overview', requireAuth, async (c) => {
  const db = getServiceClient(c.env)
  const user = c.get('user')
  let q = db.from('summative_competences').select('*, units(name, code), user_profiles(full_name, admission_no)')
  if (user.role === 'student') q = q.eq('student_id', user.id)
  else if (user.role !== 'super_admin' && user.department_id) {
    // Filter via units in department when possible
    const { data: units } = await db.from('units').select('id').eq('department_id', user.department_id)
    const ids = ((units ?? []) as Row[]).map((u) => u.id as string)
    if (ids.length) q = q.in('unit_id', ids)
  }
  const { data } = await q.order('created_at', { ascending: false }).limit(500)
  const rows = (data ?? []) as Row[]
  const competent = rows.filter((r) => r.competence === 'competent').length
  const nyc = rows.filter((r) => r.competence === 'not_yet_competent').length
  return ok(c, {
    items: rows,
    stats: { total: rows.length, competent, not_yet_competent: nyc },
  })
})

mutations.post('/summative/entry', requireAuth, async (c) => {
  const user = c.get('user')
  if (!['super_admin', 'dept_admin', 'trainer', 'examination_officer'].includes(user.role)) {
    return err(c, 'Forbidden for this role.', 403, 'forbidden')
  }
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const studentId = String(body.student_id || '').trim()
  const unitId = String(body.unit_id || '').trim()
  const competence = String(body.competence || '').trim()
  if (!studentId || !unitId || !competence) {
    return err(c, 'Student, unit and competence are required.', 400)
  }

  const { data, error } = await db
    .from('summative_competences')
    .upsert(
      {
        student_id: studentId,
        unit_id: unitId,
        competence,
        result: String(body.result || '').trim() || null,
        recorded_by: user.id,
        recorded_at: nowIso(),
      },
      { onConflict: 'student_id,unit_id' },
    )
    .select('*')
    .single()

  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'save_competence', `student:${studentId}:unit:${unitId}`)
  return ok(c, { item: data })
})

/* ── Academic trips ──────────────────────────────────────────────────────── */

mutations.post('/academic-trips', requireAuth, async (c) => {
  const user = c.get('user')
  if (!['super_admin', 'dept_admin', 'trainer'].includes(user.role)) {
    return err(c, 'Forbidden for this role.', 403, 'forbidden')
  }
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const title = String(body.title || '').trim()
  if (!title) return err(c, 'Title is required.', 400)

  const { data, error } = await db
    .from('academic_trips')
    .insert({
      title,
      destination: String(body.destination || '').trim() || null,
      trip_date: String(body.trip_date || '').trim() || null,
      summary: String(body.summary || '').trim() || null,
      status: 'submitted',
      department_id: user.department_id,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'create_trip', `trip:${(data as Row).id}`)
  return ok(c, { item: data })
})

mutations.delete('/academic-trips/:id', requireAuth, async (c) => {
  const user = c.get('user')
  if (!['super_admin', 'dept_admin', 'trainer'].includes(user.role)) {
    return err(c, 'Forbidden for this role.', 403, 'forbidden')
  }
  const db = getServiceClient(c.env)
  const { error } = await db.from('academic_trips').delete().eq('id', c.req.param('id'))
  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'delete_trip', `trip:${c.req.param('id')}`)
  return ok(c, { deleted: true })
})

mutations.post('/academic-trips/:id/media', requireAuth, async (c) => {
  const user = c.get('user')
  if (!['super_admin', 'dept_admin', 'trainer'].includes(user.role)) {
    return err(c, 'Forbidden for this role.', 403, 'forbidden')
  }
  const tripId = c.req.param('id')
  const db = getServiceClient(c.env)
  const { data: trip } = await db.from('academic_trips').select('id').eq('id', tripId).maybeSingle()
  if (!trip) return err(c, 'Trip not found.', 404)

  const body = await bodyJson(c)
  const fileName = String(body.file_name || 'media.bin').trim()
  const b64 = String(body.file_base64 || '').trim()
  if (!b64) return err(c, 'File payload is required.', 400)

  try {
    const bytes = decodeBase64Payload(b64)
    const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : 'bin'
    const path = `trips/${tripId}/${crypto.randomUUID()}.${ext}`
    const contentType = String(body.content_type || 'application/octet-stream')
    await uploadBytes(db, 'trip-media', path, bytes, contentType)
    const base = c.env.SUPABASE_URL.replace(/\/$/, '')
    const fileUrl = `${base}/storage/v1/object/public/trip-media/${path}`
    const { data, error } = await db
      .from('academic_trip_media')
      .insert({
        trip_id: tripId,
        file_url: fileUrl,
        file_name: fileName,
        caption: String(body.caption || '').trim() || null,
        uploaded_by: user.id,
      })
      .select('*')
      .single()
    if (error) return err(c, error.message, 400)
    writeAuditLog(c, 'add_trip_media', `trip:${tripId}`)
    return ok(c, { item: data })
  } catch (e) {
    return err(c, e instanceof Error ? e.message : 'Upload failed.', 500)
  }
})

/* ── Meta helpers for forms ──────────────────────────────────────────────── */

mutations.get('/meta/departments', requireAuth, async (c) => {
  const db = getServiceClient(c.env)
  const { data } = await db.from('departments').select('id, name, code').order('name')
  return ok(c, { items: data ?? [] })
})

mutations.get('/meta/courses', requireAuth, async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const requestedDept = (c.req.query('department_id') ?? '').trim()
  const dept = user.role === 'super_admin' ? requestedDept : user.department_id || ''
  let q = db.from('courses').select('id, name, code, department_id').order('name')
  if (dept) q = q.eq('department_id', dept)
  const { data } = await q
  return ok(c, { items: data ?? [] })
})

mutations.get('/meta/classes', requireAuth, async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const dept = (c.req.query('department_id') ?? '').trim() || user.department_id || ''
  let q = db.from('classes').select('id, name, department_id, course_id').order('name')
  if (dept && user.role !== 'super_admin') q = q.eq('department_id', dept)
  else if (dept) q = q.eq('department_id', dept)
  const { data } = await q
  return ok(c, { items: data ?? [] })
})

mutations.get('/meta/units', requireAuth, async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const dept = (c.req.query('department_id') ?? '').trim() || user.department_id || ''
  let q = db.from('units').select('id, name, code, department_id').order('code')
  if (dept && user.role !== 'super_admin') q = q.eq('department_id', dept)
  else if (dept) q = q.eq('department_id', dept)
  const { data } = await q.limit(1000)
  return ok(c, { items: data ?? [] })
})

mutations.get('/meta/roles', requireAuth, async (c) => {
  return ok(c, { items: Array.from(STAFF_ROLES).concat(['student']).sort() })
})

/* ── Student POE uploads ─────────────────────────────────────────────────── */

mutations.post('/student/assessments/upload', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const unitId = String(body.unit_id || '').trim()
  const assessmentType = String(body.assessment_type || '').trim().toUpperCase()
  const assessmentNo = Number(body.assessment_no) || 1
  const term = Number(body.term) || 1
  const cycle = Number(body.cycle) || 1
  const year = Number(body.year) || new Date().getFullYear()
  const fileName = String(body.file_name || 'script.pdf').trim()
  const fileBase64 = String(body.file_base64 || '').trim()
  const contentType = String(body.content_type || 'application/pdf').trim()

  if (!unitId || !assessmentType || !fileBase64) {
    return err(c, 'Unit, assessment type and file are required.', 400)
  }
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    return err(c, 'Only PDF files are accepted.', 400)
  }

  const { data: enrollment } = await db.from('enrollments').select('class_id').eq('student_id', user.id).limit(1).maybeSingle()
  const classId = (enrollment as Row | null)?.class_id as string | undefined
  if (!classId) return err(c, 'You are not enrolled in a class.', 400)

  const { data: cu } = await db
    .from('class_units')
    .select('unit_id')
    .eq('class_id', classId)
    .eq('unit_id', unitId)
    .maybeSingle()
  if (!cu) return err(c, 'Invalid unit for your class.', 400)

  const [{ data: profile }, { data: unitRow }] = await Promise.all([
    db.from('user_profiles').select('admission_no').eq('id', user.id).maybeSingle(),
    db.from('units').select('name').eq('id', unitId).maybeSingle(),
  ])
  const admSlug = fileSlug((profile as Row | null)?.admission_no ?? user.id)
  const unitSlug = fileSlug((unitRow as Row | null)?.name ?? unitId)
  const displayName = `${admSlug}-${unitSlug}-${assessmentType}-${assessmentNo}-${cycle}-${term}.pdf`
  const storagePath = `scripts/${user.id}/${displayName}`

  try {
    const bytes = decodeBase64Payload(fileBase64)
    if (bytes.length > 10 * 1024 * 1024) return err(c, 'File exceeds 10 MB limit.', 400)
    await uploadBytes(db, 'assessment-scripts', storagePath, bytes, contentType)
  } catch (e) {
    return err(c, e instanceof Error ? e.message : 'Upload failed.', 400)
  }

  const { data, error } = await db
    .from('assessments')
    .insert({
      student_id: user.id,
      class_id: classId,
      unit_id: unitId,
      assessment_type: assessmentType,
      assessment_no: assessmentNo,
      term,
      cycle,
      year,
      script_file_path: storagePath,
      script_file_name: displayName,
      script_file_size: decodeBase64Payload(fileBase64).length,
      status: 'pending',
    })
    .select('id')
    .single()
  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'upload_assessment', `assessment:${(data as Row).id}`)
  return ok(c, { assessment_id: (data as Row).id })
})

mutations.post('/student/assessments/:id/evidence', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const assessmentId = c.req.param('id')
  const body = await bodyJson(c)
  const caption = String(body.caption || '').trim()
  const fileName = String(body.file_name || '').trim()
  const fileBase64 = String(body.file_base64 || '').trim()
  const contentType = String(body.content_type || 'application/octet-stream').trim()
  const fileType = String(body.file_type || 'photo').trim()

  if (!fileName || !fileBase64) return err(c, 'File is required.', 400)

  const { data: assessment } = await db
    .from('assessments')
    .select('*, units(name)')
    .eq('id', assessmentId)
    .eq('student_id', user.id)
    .maybeSingle()
  if (!assessment) return err(c, 'Assessment not found.', 404)

  const a = assessment as Row
  const { count } = await db
    .from('evidence')
    .select('id', { count: 'exact', head: true })
    .eq('assessment_id', assessmentId)
  const evNum = (count ?? 0) + 1
  const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase() : 'jpg'
  const { data: profile } = await db.from('user_profiles').select('admission_no').eq('id', user.id).maybeSingle()
  const admSlug = fileSlug((profile as Row | null)?.admission_no ?? user.id)
  const unitSlug = fileSlug((a.units as Row | undefined)?.name ?? 'unit')
  const atype = fileSlug(a.assessment_type ?? 'FA')
  const displayName = `${admSlug}-${unitSlug}-${atype}-${a.assessment_no ?? 1}-${a.cycle ?? 1}-${a.term ?? 1}-ev${evNum}.${ext}`
  const storagePath = `evidence/${user.id}/${displayName}`

  try {
    const bytes = decodeBase64Payload(fileBase64)
    if (bytes.length > 20 * 1024 * 1024) return err(c, 'File exceeds 20 MB limit.', 400)
    await uploadBytes(db, 'assessment-evidence', storagePath, bytes, contentType)
  } catch (e) {
    return err(c, e instanceof Error ? e.message : 'Upload failed.', 400)
  }

  const { data, error } = await db
    .from('evidence')
    .insert({
      assessment_id: assessmentId,
      student_id: user.id,
      file_path: storagePath,
      file_name: displayName,
      file_type: fileType,
      file_size: decodeBase64Payload(fileBase64).length,
      caption: caption || null,
    })
    .select('id')
    .single()
  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'add_evidence', `assessment:${assessmentId}`)
  return ok(c, { evidence_id: (data as Row).id })
})

mutations.post('/student/upload-poe', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const unitId = String(body.unit_id || '').trim()
  const classId = String(body.class_id || '').trim()
  const assessmentType = String(body.assessment_type || 'THEORY').trim().toUpperCase()
  const assessmentNo = Number(body.assessment_no) || 1
  const term = Number(body.term) || 1
  const cycle = Number(body.cycle) || 1
  const year = Number(body.year) || new Date().getFullYear()
  const fileName = String(body.file_name || 'poe.pdf').trim()
  const fileBase64 = String(body.file_base64 || '').trim()
  const contentType = String(body.content_type || 'application/pdf').trim()

  if (!unitId || !classId || !fileBase64) return err(c, 'Unit, class and file are required.', 400)

  const { data: profile } = await db.from('user_profiles').select('admission_no').eq('id', user.id).maybeSingle()
  const { data: unitRow } = await db.from('units').select('name').eq('id', unitId).maybeSingle()
  const admSlug = fileSlug((profile as Row | null)?.admission_no ?? user.id)
  const unitSlug = fileSlug((unitRow as Row | null)?.name ?? unitId)
  const displayName = `${admSlug}-${unitSlug}-${assessmentType}-${assessmentNo}-${cycle}-${term}.pdf`
  const storagePath = `scripts/${user.id}/${displayName}`

  try {
    const bytes = decodeBase64Payload(fileBase64)
    if (bytes.length > 10 * 1024 * 1024) return err(c, 'File exceeds 10 MB limit.', 400)
    await uploadBytes(db, 'assessment-scripts', storagePath, bytes, contentType)
  } catch (e) {
    return err(c, e instanceof Error ? e.message : 'Upload failed.', 400)
  }

  const { data, error } = await db
    .from('assessments')
    .insert({
      student_id: user.id,
      class_id: classId,
      unit_id: unitId,
      assessment_type: assessmentType,
      assessment_no: assessmentNo,
      term,
      cycle,
      year,
      script_file_path: storagePath,
      script_file_name: fileName || displayName,
      script_file_size: decodeBase64Payload(fileBase64).length,
      status: 'pending',
    })
    .select('id')
    .single()
  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'upload_poe', `assessment:${(data as Row).id}`)
  return ok(c, { assessment_id: (data as Row).id })
})

mutations.post('/student/employment-projects', requireRole('student'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const body = await bodyJson(c)
  const title = String(body.title || '').trim()
  const description = String(body.description || '').trim()
  if (!title) return err(c, 'Project title is required.', 400)

  const payload: Row = {
    student_id: user.id,
    title,
    description: description || null,
    status: String(body.status || 'active').trim() || 'active',
    start_date: String(body.start_date || '').trim() || null,
    end_date: String(body.end_date || '').trim() || null,
    employer_name: String(body.employer_name || '').trim() || null,
  }

  const fileBase64 = String(body.file_base64 || '').trim()
  if (fileBase64) {
    const fileName = String(body.file_name || 'project.pdf').trim()
    const storagePath = `employment_projects/${user.id}/${crypto.randomUUID()}_${fileName}`
    try {
      const bytes = decodeBase64Payload(fileBase64)
      await uploadBytes(db, 'trainee-documents', storagePath, bytes, String(body.content_type || 'application/pdf'))
      payload.file_path = storagePath
      payload.file_name = fileName
    } catch (e) {
      return err(c, e instanceof Error ? e.message : 'File upload failed.', 400)
    }
  }

  const { data, error } = await db.from('employment_projects').insert(payload).select('id').single()
  if (error) return err(c, error.message, 400)
  return ok(c, { project_id: (data as Row).id })
})

mutations.post('/dept-admin/applications/:id/review', requireRole('dept_admin'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const body = await bodyJson(c)
  const action = String(body.action || '').trim()
  const notes = String(body.notes || '').trim()
  const statusMap: Record<string, string> = { approve: 'approved', reject: 'rejected' }
  const newStatus = statusMap[action]
  if (!newStatus) return err(c, 'Invalid action.', 400)

  const { data: app } = await db.from('course_applications').select('*').eq('id', id).maybeSingle()
  if (!app || (app as Row).department_id !== user.department_id) {
    return err(c, 'Application not found.', 404)
  }

  const { error } = await db
    .from('course_applications')
    .update({
      status: newStatus,
      reviewed_at: nowIso(),
      reviewed_by: user.id,
      review_notes: notes || null,
    })
    .eq('id', id)
  if (error) return err(c, error.message, 400)
  writeAuditLog(c, 'review_course_application', `app:${id}:${newStatus}`)
  return ok(c, { status: newStatus })
})

mutations.post('/liaison-officer/attachments/:id/grade', requireRole('liaison_officer'), async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const id = c.req.param('id')
  const body = await bodyJson(c)
  const { data: att } = await db.from('industrial_attachments').select('id').eq('id', id).maybeSingle()
  if (!att) return err(c, 'Attachment not found.', 404)

  const scores = {
    score_gps_attendance: Number(body.score_gps_attendance) || 0,
    score_logbook: Number(body.score_logbook) || 0,
    score_mentor_eval: Number(body.score_mentor_eval) || 0,
    score_trainer_assessment: Number(body.score_trainer_assessment) || 0,
    score_final_report: Number(body.score_final_report) || 0,
  }
  const weighted = Object.values(scores).reduce((s, v) => s + v, 0)
  const grade =
    weighted >= 80 ? 'M' : weighted >= 65 ? 'P' : weighted >= 50 ? 'C' : 'NYC'

  const payload = {
    ...scores,
    weighted_total: weighted,
    final_grade: grade,
    graded_by: user.id,
    graded_at: nowIso(),
  }

  const { data: existing } = await db.from('attachment_grades').select('id').eq('attachment_id', id).maybeSingle()
  if (existing) {
    await db.from('attachment_grades').update(payload).eq('attachment_id', id)
  } else {
    await db.from('attachment_grades').insert({ ...payload, attachment_id: id })
  }
  await db.from('industrial_attachments').update({ final_grade: grade, status: 'completed' }).eq('id', id)
  writeAuditLog(c, 'grade_attachment', `attachment:${id}`)
  return ok(c, { grade, weighted_total: weighted })
})

export default mutations
