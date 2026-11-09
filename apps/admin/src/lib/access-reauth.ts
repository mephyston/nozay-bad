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
