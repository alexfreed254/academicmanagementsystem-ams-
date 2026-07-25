import { Hono } from 'hono'
import { getServiceClient } from '../lib/supabase'
import { ok, err } from '../lib/responses'
import type { Env, AppVariables } from '../types'

const publicRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>()

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ALLOWED_EXT = new Set(['pdf', 'jpg', 'jpeg', 'png'])

function isUploadFile(value: unknown): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === 'function' &&
    'size' in value &&
    'name' in value
  )
}

publicRoutes.get('/public/departments', async (c) => {
  const db = getServiceClient(c.env)
  const { data, error } = await db.from('departments').select('id, name, code').order('name')
  if (error) return err(c, 'Could not load departments.', 500)
  return ok(c, { departments: data ?? [] })
})

publicRoutes.post('/public/apply', async (c) => {
  let form: FormData
  try {
    form = await c.req.formData()
  } catch {
    return err(c, 'Invalid form data.', 400)
  }

  const fullName = String(form.get('full_name') ?? '').trim()
  const email = String(form.get('email') ?? '').trim()
  const phone = String(form.get('phone') ?? '').trim()
  const departmentId = String(form.get('department_id') ?? '').trim()
  const courseName = String(form.get('course_name') ?? '').trim()

  if (!fullName) return err(c, 'Full name is required.', 400)
  if (!email) return err(c, 'Email is required.', 400)
  if (!departmentId) return err(c, 'Department is required.', 400)
  if (!courseName) return err(c, 'Course name is required.', 400)

  const db = getServiceClient(c.env)
  const documentPaths: string[] = []
  const files = form.getAll('documents')

  for (const entry of files) {
    if (!isUploadFile(entry) || !entry.size) continue
    if (entry.size > MAX_FILE_BYTES) {
      return err(c, `File ${entry.name} exceeds 5MB limit.`, 400)
    }
    const ext = entry.name.includes('.') ? entry.name.split('.').pop()?.toLowerCase() ?? '' : ''
    if (!ALLOWED_EXT.has(ext)) {
      return err(c, `File type not allowed: ${entry.name}`, 400)
    }
    const uniqueName = `${crypto.randomUUID()}.${ext}`
    const storagePath = `course_applications/${uniqueName}`
    const bytes = new Uint8Array(await entry.arrayBuffer())
    const { error: uploadErr } = await db.storage
      .from('application-documents')
      .upload(storagePath, bytes, {
        contentType: entry.type || 'application/octet-stream',
        upsert: false,
      })
    if (uploadErr) {
      return err(c, `Error uploading ${entry.name}.`, 500)
    }
    const base = c.env.SUPABASE_URL.replace(/\/$/, '')
    documentPaths.push(`${base}/storage/v1/object/public/application-documents/${storagePath}`)
  }

  const { error } = await db.from('course_applications').insert({
    full_name: fullName,
    email,
    phone: phone || null,
    department_id: departmentId,
    course_name: courseName,
    document_paths: documentPaths,
  })
  if (error) return err(c, 'Error submitting application.', 500)

  return ok(c, {
    submitted: true,
    message: 'Your application has been submitted successfully. You will be contacted soon.',
  })
})

export default publicRoutes
