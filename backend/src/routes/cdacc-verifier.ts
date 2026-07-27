import { Hono } from 'hono';
import { roleRequired } from '../middleware/auth';
import type { Env } from '../index';

const cdaccVerifier = new Hono<{ Bindings: Env }>();
cdaccVerifier.use('*', roleRequired('cdacc_verifier'));
export default cdaccVerifier;
