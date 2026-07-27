/**
 * Trainer routes - Attendance, assessments, marks entry
 */

import { Hono } from 'hono';
import { roleRequired, getCurrentUser } from '../middleware/auth';
import { getUserClient, getServiceClient } from '../lib/supabase';
import type { Env } from '../index';

const trainer = new Hono<{ Bindings: Env }>();

// Apply role check to all routes
trainer.use('*', roleRequired('trainer'));

// Routes defined here - to be implemented
// GET /dashboard - Dashboard with stats
// POST /attendance - Mark attendance
// GET /attendance-history - View past sessions
// GET /assessments - List student assessments
// POST /assessments/:id/review - Review assessment
// GET /marks-entry - Marks entry page
// POST /marks-entry/save-mark - Save individual mark
// And more...

export default trainer;
