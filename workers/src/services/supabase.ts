/** Service facade — Supabase clients (service-role + anon). Never expose service-role to Pages. */
export { getServiceClient, getAnonClient } from '../lib/supabase'
