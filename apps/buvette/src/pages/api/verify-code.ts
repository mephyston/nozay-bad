import type { APIRoute } from 'astro';
import { createApiClient } from '@nba/api-client';
import { COOKIE_SECURE, IS_DEV, json, resolveEnv, sessionSecret } from '../../lib/http';
import { checkCode, isLimited } from '../../lib/otp';
import {
  cardCookie,
  clearPendingCookie,
  PENDING_COOKIE,
  readCookie,
  signCardSession,
  verifyPending
} from '../../lib/session';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = resolveEnv<any>(locals);
  const secret = sessionSecret(env);
  if (!secret) return json({ ok: false, error: 'Erreur de configuration serveur.' }, 500);

  const ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
  const devBypass = IS_DEV && env.AUTH_RATE_LIMIT_DISABLED === 'true';
  if (!devBypass && (await isLimited(env.RATE_LIMIT_KV, `buvette-verify:${ip}`, 20, 900))) {
    return json({ ok: false, error: 'Trop de tentatives. Réessayez dans quelques minutes.' }, 429);
  }

  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  const code = (body?.code || '').trim();
  if (!/^\d{6}$/.test(code)) return json({ ok: false, error: 'Code à 6 chiffres attendu.' }, 400);

  const pending = readCookie(request.headers.get('cookie'), PENDING_COOKIE);
  const email = pending ? await verifyPending(pending, secret) : null;
  if (!email) return json({ ok: false, error: 'Demande expirée. Recommencez.' }, 400);

  const result = await checkCode(env.RATE_LIMIT_KV, email, code);
  if (result !== 'ok') {
    const messages = {
      expired: 'Code expiré. Demandez-en un nouveau.',
      locked: 'Trop de tentatives. Demandez un nouveau code.',
      invalid: 'Code incorrect.'
    };
    return json({ ok: false, error: messages[result] }, result === 'locked' ? 429 : 400);
  }

  const api = createApiClient(env, { caller: 'buvette' });
  const res = await api.fetch('http://localhost/buvette/cards/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  if (!res.ok) return json({ ok: false, error: "La carte n'a pas pu être ouverte." }, 502);
  const { data } = (await res.json()) as { data: { cardId: number; deviceId: string; created: boolean } };

  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', cardCookie(await signCardSession(data, secret), COOKIE_SECURE));
  headers.append('Set-Cookie', clearPendingCookie(COOKIE_SECURE));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};
