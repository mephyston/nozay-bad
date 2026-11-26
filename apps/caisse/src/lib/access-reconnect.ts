/**
 * Sortie de secours de la caisse, comme celle de l'admin (`apps/admin/src/lib/access-reauth.ts`).
 *
 * Un cookie Cloudflare Access resté d'avant le renommage du domaine d'équipe renvoie vers
 * l'ancien domaine (« Unable to find your Access organization ») avant que la requête
 * n'atteigne la caisse. `/reconnexion` doit donc être exempté d'Access (application « Bypass »
 * sur ce seul chemin) : la page efface les cookies Access, puis renvoie vers l'accueil, où
 * Access redemande un code sur le bon domaine.
 */
export const RECONNECT_PATH = '/reconnexion';

const ACCESS_COOKIES = ['CF_Authorization', 'CF_AppSession', 'CF_Binding'];

const page = (title: string, body: string) =>
  '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  `<meta name="robots" content="noindex"><title>${title}</title></head>` +
  '<body style="font-family:system-ui,sans-serif;margin:0;min-height:100dvh;display:grid;place-items:center;padding:16px">' +
  `<main style="max-width:26rem;text-align:center">${body}</main></body></html>`;

const button = (label: string, href: string) =>
  `<p><a href="${href}" style="display:inline-block;padding:10px 18px;border:1px solid #ccc;border-radius:12px;color:inherit;text-decoration:none;font-weight:600">${label}</a></p>`;

export function reconnectPage(request: Request): Response {
  const host = new URL(request.url).hostname;
  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  for (const name of ACCESS_COOKIES) {
    headers.append('Set-Cookie', `${name}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax`);
    headers.append('Set-Cookie', `${name}=; Domain=${host}; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax`);
  }
  // Le `Refresh` part après que le navigateur a appliqué les Set-Cookie : l'accueil arrive sans cookie.
  headers.set('Refresh', '2; url=/');
  const html = page(
    'Reconnexion',
    '<h1 style="font-size:1.4rem">Reconnexion à la caisse</h1>' +
      '<p>Votre ancienne connexion a été effacée. Vous allez recevoir un nouveau code par e-mail.</p>' +
      button('Se reconnecter', '/')
  );
  return new Response(html, { status: 200, headers });
}

/** Une page ouverte sans connexion valable : plutôt qu'un JSON nu, la sortie de secours. */
export function notSignedInPage(): Response {
  const html = page(
    'Connexion requise',
    '<h1 style="font-size:1.4rem">Connexion requise</h1>' +
      '<p>Votre connexion à la caisse n\'a pas pu être vérifiée. Effacez-la et demandez un nouveau code.</p>' +
      button('Se reconnecter', RECONNECT_PATH)
  );
  return new Response(html, { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
