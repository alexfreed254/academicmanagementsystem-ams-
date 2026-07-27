import { Hono } from 'hono';
import { roleRequired } from '../middleware/auth';
import type { Env } from '../index';

const serviceDept = new Hono<{ Bindings: Env }>();
serviceDept.use('*', roleRequired('library_hod', 'sports_hod', 'service_clearance_officer'));
export default serviceDept;
