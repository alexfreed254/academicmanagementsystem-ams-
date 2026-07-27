import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../index';

const clearance = new Hono<{ Bindings: Env }>();
clearance.use('*', authMiddleware);
export default clearance;
