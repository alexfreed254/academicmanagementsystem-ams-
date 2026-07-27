/**
 * Department Admin routes
 */

import { Hono } from 'hono';
import { roleRequired } from '../middleware/auth';
import type { Env } from '../index';

const deptAdmin = new Hono<{ Bindings: Env }>();
deptAdmin.use('*', roleRequired('dept_admin'));

// Routes to be implemented

export default deptAdmin;
