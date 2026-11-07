import type { APIRoute } from 'astro';
import { forCard } from '../../lib/card-api';
import { json } from '../../lib/http';

export const GET: APIRoute = ({ locals }) => forCard(locals, 'order/current');

export const POST: APIRoute = async ({ request, locals }) => {
  const body = (await request.json().catch(() => null)) as { lines?: unknown } | null;
  if (!Array.isArray(body?.lines) || body.lines.length === 0) return json({ ok: false, error: 'Votre panier est vide.' }, 400);
  return forCard(locals, 'order', { lines: body.lines });
};
