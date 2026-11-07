import type { APIRoute } from 'astro';
import { forCard } from '../../lib/card-api';
import { COOKIE_SECURE } from '../../lib/http';
import { clearCardCookie } from '../../lib/session';

export const POST: APIRoute = async ({ locals }) => {
  const res = await forCard(locals, 'delete');
  if (res.ok) res.headers.append('Set-Cookie', clearCardCookie(COOKIE_SECURE));
  return res;
};
