import type { APIRoute } from 'astro';
import { createApiClient } from '@nba/api-client';
import { rateLimiter, verifyTurnstileToken } from '../../../lib/turnstile';
import {
  generateOtpCode,
  storeOtp,
  signPending,
  buildPendingCookie,
  resolveSessionSecret,
  type SessionMember
} from '../../../lib/auth';
import { sendOtpEmail } from '../../../lib/email';
import { resolveEnv, clientIp, json, IS_DEV, COOKIE_SECURE } from '../../../lib/request-context';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = resolveEnv(locals);
  const kv = env.RATE_LIMIT_KV;
  const ip = clientIp(request);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Requête invalide.' }, 400);
  }

  const identifier = (body?.identifier || '').trim();
  const turnstileToken = body?.turnstileToken;
  if (!identifier) return json({ ok: false, error: 'Email ou numéro de licence requis.' }, 400);

  // Anti-bot
  const verify = await verifyTurnstileToken(turnstileToken, ip, { kv, runtimeEnv: env });
  if (!verify.success) {
    return json({ ok: false, error: verify.error || 'Validation anti-bot échouée.' }, 400);
  }

  // Rate-limit par IP (5 codes / 15 min)
  if (await rateLimiter.isRateLimited(`otp-ip:${ip}`, 5, 15 * 60 * 1000, kv)) {
    return json({ ok: false, error: 'Trop de demandes. Réessayez dans quelques minutes.' }, 429);
  }

  // Recherche du foyer via l'API (source de vérité sur les emails adhérent/parent)
  const api = createApiClient(env);
  let accountEmail: string | null = null;
  let members: SessionMember[] = [];
  try {
    const res = await api.fetch('http://localhost/members/lookup-household', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier })
    });
    if (res.ok) {
      const payload = (await res.json()) as any;
      accountEmail = payload?.data?.accountEmail || null;
      members = payload?.data?.members || [];
    }
  } catch (e) {
    console.error('[auth] lookup-household a échoué:', e);
  }

  const secret = resolveSessionSecret(env, IS_DEV);

  // Anti-énumération de comptes : la réponse doit être **indiscernable** qu'un
  // adhérent existe ou non. Ni le corps JSON (pas de `found`, pas d'email masqué),
  // ni la présence d'un Set-Cookie ne doivent trahir l'existence du compte — d'où
  // ce cookie leurre, signé sur une identité qui n'aura jamais d'OTP en base.
  if (!accountEmail || members.length === 0) {
    const decoy = await signPending(`unknown:${crypto.randomUUID()}`, secret);
    return json({ ok: true }, 200, { 'Set-Cookie': buildPendingCookie(decoy, COOKIE_SECURE) });
  }

  // Rate-limit par email (5 codes / 15 min) pour éviter le harcèlement d'une boîte.
  if (await rateLimiter.isRateLimited(`otp-mail:${accountEmail}`, 5, 15 * 60 * 1000, kv)) {
    return json({ ok: false, error: 'Trop de demandes pour ce compte. Réessayez plus tard.' }, 429);
  }

  const code = generateOtpCode();
  await storeOtp(kv, accountEmail, code, members);

  const sent = await sendOtpEmail(env, accountEmail, code);
  if (!sent.ok) {
    return json({ ok: false, error: sent.error || "Échec de l'envoi de l'email." }, 502);
  }

  // Cookie temporaire liant la vérification à l'email (jamais exposé au client).
  const pending = await signPending(accountEmail, secret);

  return json({ ok: true }, 200, { 'Set-Cookie': buildPendingCookie(pending, COOKIE_SECURE) });
};
