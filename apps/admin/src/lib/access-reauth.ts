/**
 * Réponse à un jeton Cloudflare Access refusé : on efface le cookie de l'application et on
 * relance la connexion, au lieu d'un refus sec.
 *
 * Le cas qui l'a motivé (09/11/2026) : le domaine d'équipe Access a été renommé
 * (`mephyston` → `nozaybad`). Les sessions ouvertes avant gardaient un jeton émis par
 * l'ancien domaine, qu'Access laissait passer jusqu'à son expiration et que l'admin
 * refusait (`unexpected "iss" claim value`) : chaque écran affichait « Impossible de
 * charger cet écran », sans issue. Sans le cookie `CF_Authorization`, Access renvoie vers
 * sa page de connexion, qui émet un jeton neuf.
 *
 * Une seule relance : le cookie `nba_reauth` la marque pour deux minutes. Si le jeton neuf
 * est refusé à son tour (configuration fausse, pas session périmée), on s'arrête sur une
 * page qui le dit, au lieu de boucler entre l'admin et Access.
 */
const REAUTH_COOKIE = 'nba_reauth';

// Access peut poser son cookie avec ou sans attribut `Domain` : un cookie ne s'efface qu'avec
// le même, on efface donc les deux.
const clearAccessCookies = (host: string) => [
  'CF_Authorization=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax',
  `CF_Authorization=; Domain=${host}; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax`
];
const markReauth = `${REAUTH_COOKIE}=1; Path=/; Max-Age=120; Secure; HttpOnly; SameSite=Lax`;

export function alreadyRetried(cookieHeader: string | null): boolean {
  return /(?:^|;\s*)nba_reauth=1(?:;|$)/.test(cookieHeader ?? '');
}

export function rejectedAccessToken(request: Request): Response {
  const url = new URL(request.url);
  const isApi = url.pathname.startsWith('/admin/api/');

  if (alreadyRetried(request.headers.get('cookie'))) {
    if (isApi) return new Response('Authentification invalide ou expirée.', { status: 403 });
    return new Response(
      '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>Connexion refusée</title></head><body style="font-family:system-ui;margin:2rem;max-width:32rem">' +
        '<h1>Connexion refusée</h1><p>Votre connexion n\'a pas pu être vérifiée, même après une nouvelle tentative.</p>' +
        '<p><a href="/cdn-cgi/access/logout">Se déconnecter et réessayer</a></p></body></html>',
      { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const headers = new Headers();
  for (const cookie of clearAccessCookies(url.hostname)) headers.append('Set-Cookie', cookie);
  headers.append('Set-Cookie', markReauth);
  headers.set('Cache-Control', 'no-store');

  // Un écran qui charge ses données recharge la page : la navigation repasse par Access.
  if (isApi || request.method !== 'GET') {
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return new Response(JSON.stringify({ success: false, error: 'Session expirée : reconnexion.', reauth: true }), { status: 401, headers });
  }

  headers.set('Location', `${url.pathname}${url.search}`);
  return new Response(null, { status: 302, headers });
}

/**
 * Sortie de secours, hors Access (application « Bypass » sur ce seul chemin) : elle efface les
 * cookies Access de l'admin puis renvoie vers l'accueil, où Access redemande un code.
 *
 * Pourquoi hors Access : après le renommage du domaine d'équipe, un cookie resté dans le
 * navigateur renvoyait vers l'ancien domaine (« Unable to find your Access organization »)
 * avant que la requête n'atteigne l'admin. Ni la révocation des sessions, qui laisse le cookie
 * en place, ni le relais de `rejectedAccessToken`, que la requête n'atteint jamais, n'en
 * sortaient. Cette page, si.
 */
export const RECONNECT_PATH = '/reconnexion';

const ACCESS_COOKIES = ['CF_Authorization', 'CF_AppSession', 'CF_Binding', REAUTH_COOKIE];

export function reconnectPage(request: Request): Response {
  const host = new URL(request.url).hostname;
  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  for (const name of ACCESS_COOKIES) {
    headers.append('Set-Cookie', `${name}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax`);
    headers.append('Set-Cookie', `${name}=; Domain=${host}; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax`);
  }
  // Le `Refresh` part après que le navigateur a appliqué les Set-Cookie : l'accueil arrive sans
  // cookie, et Access redemande un code sur le domaine d'équipe actuel.
  headers.set('Refresh', '2; url=/admin');
  const html =
    '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex"><title>Reconnexion</title></head>' +
    '<body style="font-family:system-ui,sans-serif;margin:0;min-height:100dvh;display:grid;place-items:center;padding:16px">' +
    '<main style="max-width:26rem;text-align:center"><h1 style="font-size:1.4rem">Reconnexion à l\'administration</h1>' +
    '<p>Votre ancienne connexion a été effacée. Vous allez recevoir un nouveau code par e-mail.</p>' +
    '<p><a href="/admin" style="display:inline-block;padding:10px 18px;border:1px solid #ccc;border-radius:12px;color:inherit;text-decoration:none;font-weight:600">Se reconnecter</a></p>' +
    '</main></body></html>';
  return new Response(html, { status: 200, headers });
}
