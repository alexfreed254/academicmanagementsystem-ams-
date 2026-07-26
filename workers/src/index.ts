/**
 * Cloudflare Workers entry — exports the Hono app.
 *
 * Target architecture:
 *   Pages (React) → Authorization: Bearer <session JWT> → this Worker → Supabase
 */
import app from './app'

export default app
