/**
 * Super Admin routes
 */

import { Hono } from 'hono';
import { roleRequired } from '../middleware/auth';
import type { Env } from '../index';

const superAdmin = new Hono<{ Bindings: Env }>();
superAdmin.use('*', roleRequired('super_admin'));

// Routes to be implemented

export default superAdmin;
