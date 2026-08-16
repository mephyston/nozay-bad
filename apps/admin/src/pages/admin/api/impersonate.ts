import type { APIRoute } from 'astro';
import { can as canPermission } from '@nba/iam-ui';
import { forbidden } from '../../../lib/guard';

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
  let body: { email?: string | null };
  try {
    body = (await request.json()) as { email?: string | null };
  } catch {
    return json({ success: false, error: 'Requête invalide' }, 400);
  }

  const secure = import.meta.env.DEV ? '' : ' Secure;';

  /*
   * Abandonner une identité ne demande aucun droit.
   *
   * La garde portait sur `locals.user`, donc sur l'identité *empruntée* : dès qu'on
   * usurpait un compte sans `iam:sessions:impersonate` — c'est-à-dire tous, ce droit
   * n'appartenant qu'à `super_admin` — le retour était refusé en 403 et le bandeau
   * « Revenir à … » ne faisait plus rien. Il fallait vider ses cookies pour sortir.
   *
   * Reposer le cookie ne peut que *réduire* les droits : on retombe sur l'identité
   * réelle, que le middleware revérifie de toute façon à chaque requête. Rien ne
   * justifie donc d'exiger une permission pour en sortir.
   */
  if (!body.email) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `${COOKIE}=; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=0`
      }
    });
  }

  // Prendre une identité, en revanche, se décide sur les droits du compte réellement
  // connecté — jamais sur ceux du compte déjà emprunté, qui serviraient de tremplin.
  if (!canPermission(locals.realUser?.permissions ?? [], 'iam:sessions:impersonate')) {
    return forbidden();
  }

  const realEmail = locals.realUser?.email;
  if (!realEmail) return json({ success: false, error: 'Identité réelle inconnue' }, 500);

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
