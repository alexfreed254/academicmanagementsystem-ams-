import { Hono, type Context } from 'hono'
import { getServiceClient, getAnonClient } from '../lib/supabase'
import { checkWerkzeugHash, generateWerkzeugHash } from '../lib/passwords'
import { issueSessionToken, extractBearer, verifySessionToken } from '../lib/session'
import { ok, err } from '../lib/responses'
import { writeAuditLog } from '../lib/audit'
import { loginSchema } from '../schemas'
import { assertLoginEnv } from '../lib/env'
import { requireAuth } from '../middleware/auth'
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

const PROFILE_COLS =
  'id, full_name, email, role, admission_no, staff_no, mobile_number, department_id, is_active, must_change_password, passport_file_path, passport_file_name, departments(name)'

auth.get('/auth/profile', requireAuth, async (c) => {
  const user = c.get('user')
  const db = getServiceClient(c.env)
  const { data, error } = await db.from('user_profiles').select(PROFILE_COLS).eq('id', user.id).single()
  if (error || !data) return err(c, 'Profile not found.', 404, 'not_found')
  return ok(c, { profile: data })
})

auth.patch('/auth/profile', requireAuth, async (c) => {
  const user = c.get('user')
  const body = (await c.req.json().catch(() => null)) as {
    full_name?: string
    mobile_number?: string
  } | null
  const fullName = String(body?.full_name ?? '').trim()
  const mobile = String(body?.mobile_number ?? '').trim()
  if (!fullName) return err(c, 'Full name is required.', 400)

  const db = getServiceClient(c.env)
  const { error } = await db
    .from('user_profiles')
    .update({ full_name: fullName, mobile_number: mobile || null })
    .eq('id', user.id)
  if (error) return err(c, 'Failed to update profile.', 500)

  writeAuditLog(c, 'update_profile_details', `user:${user.id}`)
  const { data } = await db.from('user_profiles').select(PROFILE_COLS).eq('id', user.id).single()
  return ok(c, { profile: data })
})

type AuthContext = Context<{ Bindings: Env; Variables: AppVariables }>

function selfRegisterEnabled(env: Env): boolean {
  const flag = (env.ALLOW_STUDENT_SELF_REGISTER ?? '').toLowerCase()
  return flag === '1' || flag === 'true' || flag === 'yes'
}

/** Alias for SPA route naming; same handler as /auth/profile/password */
auth.post('/auth/change-password', requireAuth, (c) => changePasswordHandler(c))
auth.post('/auth/profile/password', requireAuth, (c) => changePasswordHandler(c))

async function changePasswordHandler(c: AuthContext) {
  const user = c.get('user')
  const body = (await c.req.json().catch(() => null)) as {
    current_password?: string
    new_password?: string
  } | null
  const current = String(body?.current_password ?? '')
  const next = String(body?.new_password ?? '')
  if (!current) return err(c, 'Current password is required.', 400)
  if (next.length < 8 || !/\d/.test(next) || !/[!@#$]/.test(next)) {
    return err(
      c,
      'Password must be at least 8 characters with at least one number and one symbol (!@#$).',
      400,
    )
  }

  const db = getServiceClient(c.env)
  try {
    if (user.role === 'student') {
      const { data: row } = await db
        .from('user_profiles')
        .select('password_hash')
        .eq('id', user.id)
        .maybeSingle()
      const stored = String((row as { password_hash?: string } | null)?.password_hash || '')
      if (!(await checkWerkzeugHash(stored, current))) {
        return err(c, 'Current password is incorrect.', 400)
      }
      const hash = await generateWerkzeugHash(next)
      await db
        .from('user_profiles')
        .update({ password_hash: hash, must_change_password: false })
        .eq('id', user.id)
    } else {
      const email = user.email || ''
      if (!email) return err(c, 'Staff account has no email.', 400)
      const anon = getAnonClient(c.env)
      const { error: signErr } = await anon.auth.signInWithPassword({ email, password: current })
      if (signErr) return err(c, 'Current password is incorrect.', 400)
      const { error: updErr } = await db.auth.admin.updateUserById(user.id, { password: next })
      if (updErr) return err(c, 'Error changing password.', 500)
      await db.from('user_profiles').update({ must_change_password: false }).eq('id', user.id)
    }
    writeAuditLog(c, 'change_password', `user:${user.id}`)
    return ok(c, { changed: true })
  } catch {
    return err(c, 'Error changing password.', 500)
  }
}

auth.post('/auth/forgot-password', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    login_type?: string
    email?: string
    admission_no?: string
  } | null
  const loginType = String(body?.login_type ?? 'staff')

  if (loginType === 'student') {
    const admissionNo = String(body?.admission_no ?? '').trim().slice(0, 40)
    writeAuditLog(c, 'password_reset_request_denied', `admission:${admissionNo || 'unknown'}`, {
      actorId: undefined,
      actorRole: undefined,
    })
    return ok(c, {
      info:
        'Password reset is handled by your department administrator or Super Admin. ' +
        'Visit the campus office with your admission number and a valid ID.',
    })
  }

  const email = String(body?.email ?? '').trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return err(c, 'A valid email address is required.', 400)
  }

  try {
    const anon = getAnonClient(c.env)
    let origin = ''
    try {
      origin = new URL(c.req.url).origin
    } catch {
      /* ignore */
    }
    await anon.auth.resetPasswordForEmail(email, {
      redirectTo: origin ? `${origin}/login` : undefined,
    })
  } catch {
    // Same response either way — avoid account enumeration.
  }

  return ok(c, {
    sent: true,
    message:
      'If an account exists for that email, a password reset link has been sent. Check your inbox.',
  })
})

auth.post('/auth/student/register', async (c) => {
  if (!selfRegisterEnabled(c.env)) {
    return err(c, 'Student self-registration is not available.', 404, 'not_found')
  }

  const body = (await c.req.json().catch(() => null)) as {
    admission_no?: string
    email?: string
    full_name?: string
    password?: string
  } | null

  const admissionNo = String(body?.admission_no ?? '').trim()
  const email = String(body?.email ?? '').trim()
  const fullName = String(body?.full_name ?? '').trim()
  const password = String(body?.password ?? '')

  if (!admissionNo || !email || !fullName || !password) {
    return err(c, 'All fields are required.', 400)
  }
  if (password.length < 8) {
    return err(c, 'Password must be at least 8 characters.', 400)
  }

  const db = getServiceClient(c.env)

  const { data: byAdm } = await db
    .from('user_profiles')
    .select('id')
    .eq('admission_no', admissionNo)
    .limit(1)
  if (byAdm?.length) {
    return err(c, 'Admission number already registered.', 409, 'conflict')
  }

  const { data: byEmail } = await db.from('user_profiles').select('id').eq('email', email).limit(1)
  if (byEmail?.length) {
    return err(c, 'Email already registered.', 409, 'conflict')
  }

  let userId = crypto.randomUUID()
  try {
    const { data: authUser, error: authErr } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { admission_no: admissionNo },
    })
    if (!authErr && authUser.user) userId = authUser.user.id
  } catch {
    /* continue with local UUID if Supabase Auth creation fails */
  }

  const hash = await generateWerkzeugHash(password)
  const { error: insertErr } = await db.from('user_profiles').insert({
    id: userId,
    email,
    full_name: fullName,
    role: 'student',
    admission_no: admissionNo,
    password_hash: hash,
    is_active: false,
    must_change_password: false,
  })
  if (insertErr) return err(c, 'Registration failed. Please try again.', 500)

  writeAuditLog(c, 'student_self_register', `student:${userId}`, {
    actorId: userId,
    actorRole: 'student',
  })

  return ok(c, {
    registered: true,
    message: 'Registration successful. Please wait for admin approval before logging in.',
  })
})

export default auth
