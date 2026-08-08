import type { APIRoute } from 'astro';
import { can, forbidden } from '../../../lib/guard';

const COOKIE = 'impersonate_email';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * Prise et abandon d'identité, décidés côté serveur.
 *
 * Le cookie était posé par le navigateur (`document.cookie`), donc lisible et
 * modifiable par tout script de la page. Il est désormais `HttpOnly`, et surtout il
 * n'accorde rien par lui-même : le middleware revérifie à chaque requête que
 * l'identité *réelle* issue du jeton Cloudflare Access détient toujours
 * `iam:sessions:impersonate`. Retirer le rôle coupe l'usurpation en cours.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!can(locals, 'iam:sessions:impersonate')) return forbidden();

  // Le compte réel, jamais celui actuellement emprunté : sinon une usurpation en
  // cours servirait de tremplin vers une autre.
  const realEmail = locals.realUser?.email;
  if (!realEmail) return json({ success: false, error: 'Identité réelle inconnue' }, 500);

  let body: { email?: string | null };
  try {
    body = (await request.json()) as { email?: string | null };
  } catch {
    return json({ success: false, error: 'Requête invalide' }, 400);
  }

  const secure = import.meta.env.DEV ? '' : ' Secure;';

  if (!body.email) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `${COOKIE}=; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=0`
      }
    });
  }

  if (body.email === realEmail) {
    return json({ success: false, error: 'Impossible de s’emprunter soi-même.' }, 400);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `${COOKIE}=${encodeURIComponent(body.email)}; Path=/; HttpOnly;${secure} SameSite=Lax`
    }
  });
};
