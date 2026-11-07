import type { APIRoute } from 'astro';
import { forCard } from '../../lib/card-api';
import { json } from '../../lib/http';

export const POST: APIRoute = async ({ request, locals }) => {
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  if (typeof body?.code !== 'string') return json({ ok: false, error: 'Code manquant.' }, 400);
  return forCard(locals, 'attach-paper', { code: body.code });
};
