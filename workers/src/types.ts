export interface Env {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  /** HS256 signing key for session JWTs. Long random string. */
  SESSION_SECRET: string
  ALLOWED_ORIGINS: string
  ENVIRONMENT?: string
}

/**
 * Safe profile subset carried in the session JWT.
 * Mirrors Flask's SESSION_SAFE_KEYS (never password_hash or Supabase tokens).
 */
export interface SessionUser {
  id: string
  role: string
  full_name: string | null
  email: string | null
  admission_no: string | null
  staff_no: string | null
  department_id: string | null
  is_active: boolean
  must_change_password: boolean
  mobile_number: string | null
  passport_file_path: string | null
}

export type AppVariables = {
  user: SessionUser
}

/** Staff roles allowed to sign in with email + Supabase Auth (mirrors auth_utils.STAFF_ROLES). */
export const STAFF_ROLES = new Set([
  'super_admin',
  'dept_admin',
  'trainer',
  'employer',
  'examination_officer',
  'industry_mentor',
  'internal_verifier',
  'sports_hod',
  'environment_hod',
  'dean_students',
  'library_hod',
  'finance_officer',
  'registrar',
  'deputy_principal',
  'quality_assurance_officer',
  'workshop_technician',
  'liaison_officer',
  'cdacc_verifier',
  'service_clearance_officer',
])

/** Post-login landing path per role (mirrors api_v1.ROLE_HOME). */
export const ROLE_HOME: Record<string, string> = {
  super_admin: '/super-admin',
  dept_admin: '/dept-admin',
  trainer: '/trainer',
  student: '/student',
  examination_officer: '/examination-officer',
  industry_mentor: '/industry-mentor',
  internal_verifier: '/internal-verifier',
  liaison_officer: '/liaison-officer',
  cdacc_verifier: '/cdacc-verifier',
  workshop_technician: '/workshop-technician',
  registrar: '/admin-oversight/registrar',
  deputy_principal: '/admin-oversight/deputy-principal',
  quality_assurance_officer: '/admin-oversight/quality-assurance',
  library_hod: '/service-dept',
  sports_hod: '/service-dept',
  service_clearance_officer: '/service-dept',
  environment_hod: '/clearance/approver',
  dean_students: '/clearance/approver',
  finance_officer: '/clearance/approver',
}

export function publicUser(user: SessionUser) {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    admission_no: user.admission_no,
    department_id: user.department_id,
    must_change_password: Boolean(user.must_change_password),
    home_path: ROLE_HOME[user.role ?? ''] ?? '/auth/profile',
  }
}
