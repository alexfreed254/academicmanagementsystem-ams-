import { Hono } from 'hono';
import { roleRequired } from '../middleware/auth';
import type { Env } from '../index';

const workshopTech = new Hono<{ Bindings: Env }>();
workshopTech.use('*', roleRequired('workshop_technician'));
export default workshopTech;
