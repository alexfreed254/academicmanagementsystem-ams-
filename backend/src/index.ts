/**
 * TTTI Academic Management System - Cloudflare Workers Backend
 * Main entry point - Hono application with all routes
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { rateLimiter } from './middleware/rate-limiter';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';

// Route imports
import authRoutes from './routes/auth';
import studentRoutes from './routes/student';
import trainerRoutes from './routes/trainer';
import deptAdminRoutes from './routes/dept-admin';
import superAdminRoutes from './routes/super-admin';
import examOfficerRoutes from './routes/exam-officer';
import industryMentorRoutes from './routes/industry-mentor';
import internalVerifierRoutes from './routes/internal-verifier';
import liaisonOfficerRoutes from './routes/liaison-officer';
import cdaccVerifierRoutes from './routes/cdacc-verifier';
import workshopTechRoutes from './routes/workshop-tech';
import adminOversightRoutes from './routes/admin-oversight';
import serviceDeptRoutes from './routes/service-dept';
import clearanceRoutes from './routes/clearance';
import biometricRoutes from './routes/biometric';
import notificationRoutes from './routes/notifications';

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JWT_SECRET: string;
  CSRF_SECRET: string;
  SESSIONS: KVNamespace;
  BIOMETRIC_SESSION: DurableObjectNamespace;
  ENVIRONMENT: 'development' | 'staging' | 'production';
};

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', secureHeaders());

// CORS configuration for React frontend
app.use('*', cors({
  origin: (origin) => {
    const allowed = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://ttti-ams-frontend.pages.dev',
      'https://1cd16e19.ttti-ams-frontend.pages.dev',
    ];
    return allowed.includes(origin) ? origin : allowed[0];
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposeHeaders: ['X-CSRF-Token'],
}));

// CSRF protection (exclude biometric API endpoints - hardware has no CSRF token)
app.use('*', async (c, next) => {
  if (c.req.path.startsWith('/api/biometric/scan') || c.req.path.startsWith('/api/biometric/enroll')) {
    return next();
  }
  return csrf({ origin: c.req.header('origin') || '' })(c, next);
});

// Rate limiting
app.use('/api/auth/*', rateLimiter({ limit: 5, window: 60 })); // 5 req/min for auth
app.use('/api/*', rateLimiter({ limit: 100, window: 60 })); // 100 req/min for general API

// Health check
app.get('/health', (c) => c.json({ ok: true, service: 'ttti-ams-backend', timestamp: new Date().toISOString() }));

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/student', studentRoutes);
app.route('/api/trainer', trainerRoutes);
app.route('/api/dept-admin', deptAdminRoutes);
app.route('/api/super-admin', superAdminRoutes);
app.route('/api/exam-officer', examOfficerRoutes);
app.route('/api/industry-mentor', industryMentorRoutes);
app.route('/api/internal-verifier', internalVerifierRoutes);
app.route('/api/liaison-officer', liaisonOfficerRoutes);
app.route('/api/cdacc-verifier', cdaccVerifierRoutes);
app.route('/api/workshop-tech', workshopTechRoutes);
app.route('/api/admin-oversight', adminOversightRoutes);
app.route('/api/service-dept', serviceDeptRoutes);
app.route('/api/clearance', clearanceRoutes);
app.route('/api/biometric', biometricRoutes);
app.route('/api/notifications', notificationRoutes);

// 404 handler
app.notFound((c) => c.json({ ok: false, error: 'Route not found' }, 404));

// Error handler
app.onError(errorHandler);

export default app;

// Durable Object for biometric sessions
export { BiometricSession } from './durable-objects/biometric-session';
