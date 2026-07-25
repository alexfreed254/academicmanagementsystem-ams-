import { Hono } from 'hono'
import { getServiceClient, getAnonClient } from '../lib/supabase'
import { checkWerkzeugHash } from '../lib/passwords'
import { issueSessionToken, extractBearer, verifySessionToken } from '../lib/session'
import { ok, err } from '../lib/responses'
import { writeAuditLog } from '../lib/audit'
import { loginSchema } from '../schemas'
import { assertLoginEnv } from '../lib/env'
import { STAFF_ROLES, publicUser, type Env, type AppVariables, type SessionUser } from '../types'

const auth = new Hono<{ Bindings: Env; Variables: AppVariables }>()

/** Strip secrets before the profile enters a session token (mirrors session_safe_profile). */
function toSessionUser(profile: Record<string, unknown>): SessionUser {
  return {
    id: String(profile.id),
    role: String(profile.role ?? ''),
    full_name: (profile.full_name as string) ?? null,
    email: (profile.email as string) ?? null,
    admission_no: (profile.admission_no as string) ?? null,
    staff_no: (profile.staff_no as string) ?? null,
    department_id: (profile.department_id as string) ?? null,
    is_active: Boolean(profile.is_active),
    must_change_password: Boolean(profile.must_change_password),
    mobile_number: (profile.mobile_number as string) ?? null,
    passport_file_path: (profile.passport_file_path as string) ?? null,
  }
}

// Legacy compatibility: the SPA prefetches a CSRF token before mutating calls.
// Bearer-token auth carries no ambient credentials, so CSRF protection is not
// required — return a placeholder to keep older frontend builds working.
auth.get('/csrf-token', (c) => ok(c, { csrf_token: 'not-required-bearer-auth' }))

auth.post('/auth/login', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = loginSchema.safeParse(body ?? {})
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return err(c, first?.message ?? "login_type must be 'staff' or 'student'.", 400)
  }
  const data = parsed.data
  assertLoginEnv(c.env)
  const db = getServiceClient(c.env)

  if (data.login_type === 'staff') {
    const email = data.email.toLowerCase()
    if (!email.includes('@')) {
      return err(c, 'Staff / Admin sign-in requires an email address and password.', 400)
    }

    const { data: rows } = await db.from('user_profiles').select('*').eq('email', email).limit(1)
    const profile = rows?.[0]
    if (!profile || !STAFF_ROLES.has(profile.role) || !profile.is_active) {
      return err(c, 'Invalid email or password.', 401, 'invalid_credentials')
    }

    // Employers must be verified by super admin before they can log in.
    if (profile.role === 'employer') {
      const { data: emp } = await db
        .from('employers')
        .select('is_verified')
        .eq('profile_id', profile.id)
        .limit(1)
      if (!emp?.[0]?.is_verified) {
        return err(c, 'Your employer account is awaiting verification.', 403, 'unverified_employer')
      }
    }

    // Verify the password against Supabase Auth (GoTrue).
    const anon = getAnonClient(c.env)
    const { data: signIn, error } = await anon.auth.signInWithPassword({
      email,
      password: data.password,
    })
    if (error || !signIn?.user) {
      return err(c, 'Invalid email or password.', 401, 'invalid_credentials')
    }

    const user = toSessionUser(profile)
    const token = await issueSessionToken(c.env, user)
    c.set('user', user)
    writeAuditLog(c, 'login', `user:${user.id}`)
    return ok(c, { user: publicUser(user), token })
  }

  // Student login — admission number + Werkzeug password hash (no Supabase Auth).
  const admissionNo = data.admission_no
  if (admissionNo.includes('@')) {
    return err(c, 'Trainee sign-in requires an admission number and password, not an email.', 400)
  }

  const cols =
    'id, email, full_name, role, admission_no, staff_no, department_id, ' +
    'is_active, must_change_password, password_hash, mobile_number, passport_file_path'

  let { data: rows } = await db
    .from('user_profiles')
    .select(cols)
    .eq('admission_no', admissionNo)
    .eq('role', 'student')
    .limit(1)

  if (!rows?.length) {
    // Case-insensitive fallback for mixed-case admission numbers
    const fallback = await db
      .from('user_profiles')
      .select(cols)
      .ilike('admission_no', admissionNo)
      .eq('role', 'student')
      .limit(1)
    rows = fallback.data
  }

  const profile = rows?.[0] as (Record<string, unknown> & { password_hash?: string }) | undefined
  if (!profile || !profile.is_active || !profile.password_hash) {
    return err(c, 'Invalid admission number or password.', 401, 'invalid_credentials')
  }

  const valid = await checkWerkzeugHash(profile.password_hash, data.password)
  if (!valid) {
    return err(c, 'Invalid admission number or password.', 401, 'invalid_credentials')
  }

  const user = toSessionUser(profile)
  const token = await issueSessionToken(c.env, user)
  c.set('user', user)
  writeAuditLog(c, 'login', `student:${user.id}`)
  return ok(c, { user: publicUser(user), token })
})

auth.post('/auth/logout', async (c) => {
  // Stateless tokens: the client discards the token. Audit if one was presented.
  const token = extractBearer(c.req.header('Authorization'))
  if (token) {
    const user = await verifySessionToken(c.env, token)
    if (user) {
      writeAuditLog(c, 'logout', `user:${user.id}`, { actorId: user.id, actorRole: user.role })
    }
  }
  return ok(c, { logged_out: true })
})

auth.get('/auth/me', async (c) => {
  const token = extractBearer(c.req.header('Authorization'))
  const user = token ? await verifySessionToken(c.env, token) : null
  if (!user) return err(c, 'Not authenticated.', 401, 'unauthorized')
  return ok(c, { user: publicUser(user) })
})

export default auth
