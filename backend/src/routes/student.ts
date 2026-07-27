/**
 * Student routes
 */

import { Hono } from 'hono';
import { roleRequired, getCurrentUser } from '../middleware/auth';
import { getUserClient } from '../lib/supabase';
import type { Env } from '../index';

const student = new Hono<{ Bindings: Env }>();

// Apply role check to all routes
student.use('*', roleRequired('student'));

/**
 * GET /api/student/dashboard
 * Returns dashboard data for the student
 */
student.get('/dashboard', async (c) => {
  const env = c.env as Env;
  const user = getCurrentUser(c);
  const client = getUserClient(env, c.get('accessToken') || '');

  try {
    // Fetch dashboard data
    const [attendance, assessments, notifications, marks] = await Promise.all([
      client.from('attendance').select('*').eq('student_id', user.id).limit(10),
      client.from('assessments').select('*').eq('student_id', user.id).order('uploaded_at', { ascending: false }).limit(5),
      client.from('notifications').select('*').eq('user_id', user.id).eq('is_read', false).limit(5),
      client.from('formative_marks').select('*, formative_assessments(*)').eq('student_id', user.id).limit(10),
    ]);

    return c.json({
      ok: true,
      data: {
        attendance: attendance.data || [],
        assessments: assessments.data || [],
        notifications: notifications.data || [],
        marks: marks.data || [],
      },
    });
  } catch (error) {
    console.error('[student/dashboard]', error);
    return c.json({ ok: false, error: 'Failed to fetch dashboard data' }, 500);
  }
});

// Placeholder routes - to be implemented
student.get('/attendance', async (c) => {
  return c.json({ ok: true, data: [], message: 'To be implemented' });
});

student.get('/marks', async (c) => {
  return c.json({ ok: true, data: [], message: 'To be implemented' });
});

student.get('/assessments', async (c) => {
  return c.json({ ok: true, data: [], message: 'To be implemented' });
});

export default student;
