/*
  Garde des navigations de l'admin, chargé dans le service worker généré par workbox
  (`importScripts`, voir astro.config.mjs). Script classique, sans module ni dépendance.

  Pourquoi. Depuis le renommage du domaine d'équipe Cloudflare Access, un cookie resté dans
  le navigateur peut renvoyer vers l'ancien domaine (« Unable to find your Access
  organization ») AVANT que la requête n'atteigne l'admin : le Worker ne la voit jamais. Le
  service worker, lui, passe avant le réseau. Quand une navigation repart vers Access (une
  redirection hors de notre origine), il envoie d'abord sur `/reconnexion`, exemptée d'Access,
  qui efface les cookies : la connexion qui suit se fait sur le bon domaine.

  On ne voit pas la cible d'une redirection de navigation (`opaqueredirect`). On rejoue donc la
  requête en suivant les redirections : une redirection interne aboutit, une redirection vers
  Access (autre origine, sans CORS) lève. Une session simplement expirée passe aussi par
  `/reconnexion` : deux secondes de plus, puis la connexion habituelle.

  Garde-fou : une seule reconnexion par période de deux minutes, notée dans le cache (un
  service worker peut être arrêté entre deux requêtes). Au-delà, la redirection passe telle
  quelle — sans quoi /admin → /reconnexion → /admin bouclerait. Toute erreur inattendue laisse
  passer la requête : jamais de page blanche à cause de ce garde.
*/

var REAUTH_PATH = '/reconnexion';
var REAUTH_GUARD_MS = 2 * 60 * 1000;
var REAUTH_GUARD_CACHE = 'nba-reauth-guard';
var REAUTH_GUARD_KEY = '/__reauth-guard';

/** La navigation est-elle à garder ? Notre origine seulement, hors de la reconnexion et d'Access. */
function shouldGuardNavigation(request, origin) {
  if (request.mode !== 'navigate' || request.method !== 'GET') return false;
  var url = new URL(request.url);
  if (url.origin !== origin) return false;
  return url.pathname !== REAUTH_PATH && url.pathname.indexOf('/cdn-cgi/') !== 0;
}

async function recentlyReconnected(cachesApi, now) {
  var cache = await cachesApi.open(REAUTH_GUARD_CACHE);
  var stamp = await cache.match(REAUTH_GUARD_KEY);
  if (!stamp) return false;
  return now - Number(await stamp.text()) < REAUTH_GUARD_MS;
}

async function markReconnected(cachesApi, now) {
  var cache = await cachesApi.open(REAUTH_GUARD_CACHE);
  await cache.put(REAUTH_GUARD_KEY, new Response(String(now)));
}

/**
 * Rend la réponse d'une navigation gardée. `deps` : `fetch`, `caches`, `now()`, `origin`,
 * `redirect(url)` — injectés pour les tests.
 */
async function handleGuardedNavigation(request, deps) {
  var first = await deps.fetch(request);
  if (first.type !== 'opaqueredirect') return first;
  try {
    await deps.fetch(request.url, { redirect: 'follow', credentials: 'same-origin' });
    // Redirection interne (écran réorganisé, relance d'un jeton refusé) : le navigateur la suit.
    return first;
  } catch (error) {
    if (await recentlyReconnected(deps.caches, deps.now())) return first;
    await markReconnected(deps.caches, deps.now());
    return deps.redirect(deps.origin + REAUTH_PATH + '?depuis=sw');
  }
}

if (typeof self !== 'undefined' && typeof self.addEventListener === 'function' && self.location) {
  self.addEventListener('fetch', function (event) {
    var request = event.request;
    if (!shouldGuardNavigation(request, self.location.origin)) return;
    event.respondWith(
      handleGuardedNavigation(request, {
        fetch: fetch.bind(self),
        caches: caches,
        now: Date.now,
        origin: self.location.origin,
        redirect: function (url) {
          return Response.redirect(url, 302);
        }
      }).catch(function () {
        return fetch(request);
      })
    );
  });
}
