import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Env } from '../types'

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
} as const

/**
 * Service-role client — bypasses RLS. Server-side only; the key lives in a
 * Worker secret and is never sent to the browser. All RBAC and department
 * isolation is enforced in middleware/route code (same model as the Flask app).
 */
export function getServiceClient(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, clientOptions)
}

/** Anon client — used only to verify staff credentials against Supabase Auth. */
export function getAnonClient(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, clientOptions)
}
