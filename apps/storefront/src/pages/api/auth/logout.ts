import type { APIRoute } from 'astro';
import { buildLogoutCookie } from '../../../lib/auth';
import { json, COOKIE_SECURE } from '../../../lib/request-context';

export const POST: APIRoute = async () => {
  return json({ ok: true }, 200, { 'Set-Cookie': buildLogoutCookie(COOKIE_SECURE) });
};
