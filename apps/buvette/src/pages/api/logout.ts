import type { APIRoute } from 'astro';
import { COOKIE_SECURE, json } from '../../lib/http';
import { clearCardCookie } from '../../lib/session';

export const POST: APIRoute = async () => json({ ok: true }, 200, { 'Set-Cookie': clearCardCookie(COOKIE_SECURE) });
