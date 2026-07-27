import { Hono } from 'hono';
import { roleRequired } from '../middleware/auth';
import type { Env } from '../index';

const liaisonOfficer = new Hono<{ Bindings: Env }>();
liaisonOfficer.use('*', roleRequired('liaison_officer'));
export default liaisonOfficer;
