/**
 * Biometric attendance routes - No CSRF protection on hardware endpoints
 */

import { Hono } from 'hono';
import { roleRequired } from '../middleware/auth';
import type { Env } from '../index';

const biometric = new Hono<{ Bindings: Env }>();

// Trainer endpoints (CSRF protected)
biometric.use('/session/*', roleRequired('trainer'));

// Hardware endpoints (NO CSRF) - validated by IP whitelist or API key
biometric.post('/scan', async (c) => {
  // Handle biometric scan from hardware
  return c.json({ ok: true });
});

biometric.post('/enroll', async (c) => {
  // Handle biometric enrollment
  return c.json({ ok: true });
});

export default biometric;
