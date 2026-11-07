import type { APIRoute } from 'astro';
import { createApiClient } from '@nba/api-client';
import { json, resolveEnv } from '../../lib/http';

/** Déclenche la relecture chez SumUp, sans rien en rendre : c'est tout ce que sait faire un anonyme. */
export const POST: APIRoute = async ({ request, locals }) => {
  const body = (await request.json().catch(() => null)) as { foreignTxId?: string } | null;
  const foreignTxId = body?.foreignTxId ?? '';
  if (!/^buv-[0-9a-f]{32}$/.test(foreignTxId)) return json({ ok: false }, 400);
  const api = createApiClient(resolveEnv<any>(locals), { caller: 'caisse' });
  await api.fetch('http://localhost/buvette/card-attempts/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ foreignTxId })
  });
  return json({ ok: true });
};
