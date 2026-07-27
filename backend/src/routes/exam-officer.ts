import { Hono } from 'hono';
import { roleRequired } from '../middleware/auth';
import type { Env } from '../index';

const examOfficer = new Hono<{ Bindings: Env }>();
examOfficer.use('*', roleRequired('examination_officer'));
export default examOfficer;
