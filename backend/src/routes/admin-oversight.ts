import { Hono } from 'hono';
import { roleRequired } from '../middleware/auth';
import type { Env } from '../index';

const adminOversight = new Hono<{ Bindings: Env }>();
adminOversight.use('*', roleRequired('registrar', 'deputy_principal', 'quality_assurance_officer'));
export default adminOversight;
