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
import { sendOtpEmail, sendRenewalEmail, sendUpcomingAccessEmail } from '../../../lib/email';
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

  // Bypass du rate-limit en développement (opt-in via .dev.vars).
  //
  // En local il n'y a pas de `CF-Connecting-IP` : `clientIp()` retombe sur 127.0.0.1,
  // donc *toutes* les tentatives — quel que soit le compte testé — partagent le même
  // compteur de 5 codes / 15 min. Deux essais de bout en bout et l'on est bloqué.
  //
  // Double verrou volontaire : `IS_DEV` vient de `import.meta.env.DEV`, inliné à false
  // au build de production — poser la variable sur un Worker déployé resterait donc
  // sans effet. La variable, elle, rend le bypass explicite : la retirer permet de
  // tester le limiteur lui-même en local.
  const bypassRateLimit = IS_DEV && env.AUTH_RATE_LIMIT_DISABLED === 'true';

  // Anti-bot
  const verify = await verifyTurnstileToken(turnstileToken, ip, { kv, runtimeEnv: env });
  if (!verify.success) {
    return json({ ok: false, error: verify.error || 'Validation anti-bot échouée.' }, 400);
  }

  // Rate-limit par IP (5 codes / 15 min)
  if (!bypassRateLimit && (await rateLimiter.isRateLimited(`otp-ip:${ip}`, 5, 15 * 60 * 1000, kv))) {
    return json({ ok: false, error: 'Trop de demandes. Réessayez dans quelques minutes.' }, 429);
  }

  // Recherche du foyer via l'API (source de vérité sur les emails adhérent/parent)
  const api = createApiClient(env);
  let accountEmail: string | null = null;
  let members: SessionMember[] = [];
  let status: 'granted' | 'upcoming' | 'lapsed' | 'unknown' = 'unknown';
  let seasonCode = '';
  let seasonName = '';
  let accessOpensOn = '';
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
      status = payload?.data?.status || 'unknown';
      seasonCode = payload?.data?.seasonCode || '';
      seasonName = payload?.data?.seasonName || '';
      accessOpensOn = payload?.data?.accessOpensOn || '';
    }
  } catch (e) {
    console.error('[auth] lookup-household a échoué:', e);
  }

  const secret = resolveSessionSecret(env, IS_DEV);

  // Anti-énumération de comptes : la réponse doit être **indiscernable** qu'un
  // adhérent existe ou non. Ni le corps JSON (pas de `found`, pas d'email masqué),
  // ni la présence d'un Set-Cookie ne doivent trahir l'existence du compte — d'où
  // ce cookie leurre, signé sur une identité qui n'aura jamais d'OTP en base.
  //
  // C'est aussi la réponse servie à l'ex-adhérent : ce qu'on a à lui dire part par email,
  // le seul canal dont la propriété soit déjà prouvée.
  const decoy = async () =>
    json({ ok: true }, 200, {
      'Set-Cookie': buildPendingCookie(await signPending(`unknown:${crypto.randomUUID()}`, secret), COOKIE_SECURE)
    });

  if (!accountEmail || status === 'unknown') return decoy();

  // Rate-limit par email (5 envois / 15 min) pour éviter le harcèlement d'une boîte.
  const mailRateLimited =
    !bypassRateLimit && (await rateLimiter.isRateLimited(`otp-mail:${accountEmail}`, 5, 15 * 60 * 1000, kv));

  // Pas de licence en cours : on explique par email, sans jamais poser d'OTP en base.
  // Y compris sous rate-limit, la réponse reste celle de l'inconnu — un 429 ici
  // trahirait que l'adresse est au fichier du club.
  if (status === 'lapsed' || status === 'upcoming') {
    if (!mailRateLimited) {
      await (status === 'lapsed'
        ? sendRenewalEmail(env, accountEmail, seasonName)
        : sendUpcomingAccessEmail(env, accountEmail, seasonName, accessOpensOn));
    }
    return decoy();
  }

  if (members.length === 0) return decoy();

  if (mailRateLimited) {
    return json({ ok: false, error: 'Trop de demandes pour ce compte. Réessayez plus tard.' }, 429);
  }

  const code = generateOtpCode();
  await storeOtp(kv, accountEmail, code, members, seasonCode);

  const sent = await sendOtpEmail(env, accountEmail, code);
  if (!sent.ok) {
    return json({ ok: false, error: sent.error || "Échec de l'envoi de l'email." }, 502);
  }

  // Cookie temporaire liant la vérification à l'email (jamais exposé au client).
  const pending = await signPending(accountEmail, secret);

  return json({ ok: true }, 200, { 'Set-Cookie': buildPendingCookie(pending, COOKIE_SECURE) });
};
