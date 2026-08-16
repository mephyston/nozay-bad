import type { APIRoute } from 'astro';
import {
  verifyOtp,
  verifyPending,
  readPendingCookie,
  signSession,
  buildSessionCookie,
  buildPendingClearCookie,
  resolveSessionSecret,
  type SessionMember
} from '../../../lib/auth';
import { rateLimiter } from '../../../lib/turnstile';
import { resolveEnv, clientIp, json, IS_DEV, COOKIE_SECURE } from '../../../lib/request-context';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = resolveEnv(locals);
  const kv = env.RATE_LIMIT_KV;
  const secret = resolveSessionSecret(env, IS_DEV);

  // Fail-closed, comme le middleware : sans secret, on ne signe rien — surtout pas
  // une session avec une clé vide.
  if (!secret) {
    console.error('[auth] SESSION_SECRET non configuré');
    return json({ ok: false, error: 'Erreur de configuration serveur.' }, 500);
  }

  // Rate-limit par IP, pendant de celui de request-code : le compteur de tentatives
  // du code (5, en KV) est la garde principale, mais son lecture-modification-écriture
  // n'est pas atomique — une rafale distribuée pouvait le dépasser. Même bypass de
  // développement que request-code (cf. le commentaire là-bas).
  const bypassRateLimit = IS_DEV && env.AUTH_RATE_LIMIT_DISABLED === 'true';
  if (!bypassRateLimit && (await rateLimiter.isRateLimited(`otp-verify:${clientIp(request)}`, 10, 15 * 60 * 1000, kv))) {
    return json({ ok: false, error: 'Trop de tentatives. Réessayez dans quelques minutes.' }, 429);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Requête invalide.' }, 400);
  }

  const code = (body?.code || '').trim();
  if (!/^\d{6}$/.test(code)) {
    return json({ ok: false, error: 'Code à 6 chiffres attendu.' }, 400);
  }

  // L'email vient du cookie temporaire signé (pas du client).
  const pendingToken = readPendingCookie(request.headers.get('cookie'));
  const email = pendingToken ? await verifyPending(pendingToken, secret) : null;
  if (!email) {
    return json({ ok: false, error: 'Session de connexion expirée. Recommencez.' }, 400);
  }

  const result = await verifyOtp(kv, email, code);
  if (!result.ok) {
    const message =
      result.error === 'locked'
        ? 'Trop de tentatives. Demandez un nouveau code.'
        : result.error === 'expired'
          ? 'Code expiré. Demandez un nouveau code.'
          : 'Code incorrect.';
    const status = result.error === 'locked' ? 429 : 400;
    return json({ ok: false, error: message }, status);
  }

  const members = (result.members || []) as SessionMember[];
  const activeMemberId = members[0]?.id;
  if (activeMemberId === undefined) {
    return json({ ok: false, error: 'Aucun dossier associé.' }, 400);
  }

  // La saison est celle contre laquelle la licence a été vérifiée à la demande du code.
  const token = await signSession(
    { email, members, activeMemberId, seasonCode: result.seasonCode || '' },
    secret
  );

  // Pose la session, purge le cookie temporaire.
  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', buildSessionCookie(token, COOKIE_SECURE));
  headers.append('Set-Cookie', buildPendingClearCookie(COOKIE_SECURE));

  return new Response(
    JSON.stringify({ ok: true, members, activeMemberId }),
    { status: 200, headers }
  );
};
