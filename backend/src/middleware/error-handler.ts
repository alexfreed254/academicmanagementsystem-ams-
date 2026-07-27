/**
 * Global error handler for Hono
 */

import { Context } from 'hono';

export function errorHandler(err: Error, c: Context) {
  console.error('[Error]', err);

  // Development vs production error messages
  const isDev = c.env.ENVIRONMENT === 'development';

  return c.json({
    ok: false,
    error: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack }),
  }, 500);
}
