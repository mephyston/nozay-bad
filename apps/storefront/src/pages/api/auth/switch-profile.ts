import type { APIRoute } from 'astro';
import {
  verifySession,
  readSessionCookie,
  signSession,
  buildSessionCookie,
  resolveSessionSecret
} from '../../../lib/auth';
import { resolveEnv, json, IS_DEV, COOKIE_SECURE } from '../../../lib/request-context';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = resolveEnv(locals);
  const secret = resolveSessionSecret(env, IS_DEV);

  const token = readSessionCookie(request.headers.get('cookie'));
  const session = token ? await verifySession(token, secret) : null;
  if (!session) {
    return json({ ok: false, error: 'Non authentifié.' }, 401);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Requête invalide.' }, 400);
  }

  const memberId = Number(body?.memberId);
  // Le profil demandé doit appartenir au foyer de la session.
  if (!session.members.some((m) => m.id === memberId)) {
    return json({ ok: false, error: 'Profil non autorisé.' }, 403);
  }

  const newToken = await signSession(
    {
      email: session.email,
      members: session.members,
      activeMemberId: memberId,
      seasonCode: session.seasonCode
    },
    secret
  );

  return json({ ok: true, activeMemberId: memberId }, 200, {
    'Set-Cookie': buildSessionCookie(newToken, COOKIE_SECURE)
  });
};
