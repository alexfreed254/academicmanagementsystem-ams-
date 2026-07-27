/**
 * Rate limiting middleware for Cloudflare Workers
 * Uses in-memory store (consider Durable Objects for distributed rate limiting)
 */

import { Context, Next } from 'hono';

interface RateLimitOptions {
  limit: number; // Max requests
  window: number; // Time window in seconds
}

const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter(options: RateLimitOptions) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const key = `${ip}:${c.req.path}`;
    const now = Date.now();

    const record = store.get(key);
    
    if (!record || now > record.resetAt) {
      // First request or window expired
      store.set(key, {
        count: 1,
        resetAt: now + options.window * 1000,
      });
      return await next();
    }

    if (record.count >= options.limit) {
      return c.json({
        ok: false,
        error: 'Rate limit exceeded',
        retry_after: Math.ceil((record.resetAt - now) / 1000),
      }, 429);
    }

    record.count++;
    return await next();
  };
}

