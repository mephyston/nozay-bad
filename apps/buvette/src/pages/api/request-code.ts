import type { APIRoute } from 'astro';
import { deliver } from '@nba/mailer';
import { COOKIE_SECURE, IS_DEV, json, resolveEnv, sessionSecret } from '../../lib/http';
import { generateCode, isLimited, storeCode, verifyTurnstile } from '../../lib/otp';
import { pendingCookie, signPending } from '../../lib/session';
import { codeMail, mailClub } from '../../lib/card-mails';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const POST: APIRoute = async ({ request, locals }) => {
  const env = resolveEnv<any>(locals);
  const secret = sessionSecret(env);
  if (!secret) return json({ ok: false, error: 'Erreur de configuration serveur.' }, 500);

  const body = (await request.json().catch(() => null)) as { email?: string; turnstileToken?: string; acceptTerms?: boolean } | null;
  const email = (body?.email || '').trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) return json({ ok: false, error: 'Adresse invalide.' }, 400);
  // Sans acceptation, pas de code : la carte ne s'ouvre qu'avec les conditions acceptées.
  if (body?.acceptTerms !== true) return json({ ok: false, error: "Acceptez les conditions d'utilisation pour continuer." }, 400);

  const ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
  const devBypass = IS_DEV && env.AUTH_RATE_LIMIT_DISABLED === 'true';
  if (!devBypass) {
    // Ouverte à toute adresse : sans ces bornes, cette page enverrait du courriel à la demande.
    if (!(await verifyTurnstile(env.TURNSTILE_SECRET_KEY, body?.turnstileToken || '', ip))) {
      return json({ ok: false, error: 'Vérification anti-robot échouée. Réessayez.' }, 400);
    }
    if (await isLimited(env.RATE_LIMIT_KV, `buvette-ip:${ip}`, 10, 900)) {
      return json({ ok: false, error: 'Trop de demandes. Réessayez dans quelques minutes.' }, 429);
    }
    if (await isLimited(env.RATE_LIMIT_KV, `buvette-mail:${email}`, 3, 900)) {
      return json({ ok: false, error: 'Trop de codes demandés pour cette adresse. Réessayez plus tard.' }, 429);
    }
  }

  const code = generateCode();
  await storeCode(env.RATE_LIMIT_KV, email, code);
  const club = mailClub(locals);
  const sent = await deliver(env, club, email, codeMail(club.name, code), (mode) =>
    console.info(`[buvette][${mode}] code pour ${email} : ${code} (courriel NON envoyé)`)
  );
  if (!sent.ok) return json({ ok: false, error: sent.error || "Échec de l'envoi." }, 502);

  return json({ ok: true }, 200, { 'Set-Cookie': pendingCookie(await signPending(email, secret), COOKIE_SECURE) });
};
