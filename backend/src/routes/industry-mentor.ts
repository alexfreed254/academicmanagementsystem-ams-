import { Hono } from 'hono';
import { roleRequired } from '../middleware/auth';
import type { Env } from '../index';

const industryMentor = new Hono<{ Bindings: Env }>();
industryMentor.use('*', roleRequired('industry_mentor'));
export default industryMentor;
