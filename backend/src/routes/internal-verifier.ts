import { Hono } from 'hono';
import { roleRequired } from '../middleware/auth';
import type { Env } from '../index';

const internalVerifier = new Hono<{ Bindings: Env }>();
internalVerifier.use('*', roleRequired('internal_verifier'));
export default internalVerifier;
