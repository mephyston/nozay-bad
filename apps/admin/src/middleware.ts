import { defineMiddleware } from 'astro:middleware';
import type { APIContext, MiddlewareNext } from 'astro';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { createApiClient } from '@nba/api-client';
import { resolveEnv as resolveRuntimeEnv } from '@nba/runtime-env';
import { can, resolvePermissions, isRole, DEFAULT_ROLE, type ActorDto, type Role } from '@nba/iam-ui';
import { applySecurityHeaders } from './lib/security-headers';
import { PAGE_PERMISSIONS, matchPagePattern, isPageRoute } from './lib/page-permissions';
import { accepteEcriture } from './lib/page-writes';
import { impersonationEnabled } from './lib/guard';

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJWKS(teamDomain: string) {
  let jwks = jwksCache.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
    jwksCache.set(teamDomain, jwks);
  }
  return jwks;
}

// Fusion `cloudflare:workers` + env runtime Astro : mécanisme partagé (@nba/runtime-env).
function resolveEnv(context: APIContext): Record<string, string> {
  return resolveRuntimeEnv<Record<string, string>>(context.locals);
}

function readCookie(request: Request, name: string): string | undefined {
  const raw = request.headers.get('cookie')?.match(new RegExp(`${name}=([^;]+)`))?.[1];
  return raw ? decodeURIComponent(raw) : undefined;
}

/**
 * Cache de résolution d'identité, à l'échelle de l'isolate.
 *
 * `fetchActor` s'exécutait à **chaque** requête — le middleware garde toutes les pages,
 * donc il ne peut pas ne pas s'exécuter. Tant qu'une page valait une requête, c'était un
 * appel de service par page. Depuis la conversion en coquilles, une page vaut une
 * coquille et trois relais : mesuré en production, `GET /iam/me` suivait exactement le
 * nombre d'invocations de l'admin — 135 pour 135, sur trois fenêtres — soit 77 appels à
 * l'heure là où il y en avait 23.
 *
 * Le cache d'identité de `lib/identite.ts` ne pouvait rien pour ça : il vit dans le
 * navigateur et ne couvre que `/admin/api/me`, l'une des quatre invocations.
 *
 * Trente secondes, comme `apps/api/src/authz/actor.ts` — délibérément **pas** plus : ce
 * cache-ci décide de l'affichage, celui-là de l'autorisation, et une coquille qui
 * montrerait un menu que l'API refuse déjà serait un état à moitié fonctionnel. Aligner
 * les deux durées fait qu'ils périment ensemble.
 */
const ACTEUR_TTL_MS = 30_000;
const ACTEUR_MAX_ENTREES = 500;

const acteursGardes = new Map<string, { acteur: ActorDto | null; expireA: number }>();

/**
 * Vide le cache. Réservé aux tests : l'état vit à l'échelle du module, donc un cas qui
 * change les droits d'une adresse hériterait de la résolution du cas précédent.
 */
export function viderCacheActeur(): void {
  acteursGardes.clear();
}

/**
 * Résout un compte via l'API, qui est l'autorité en matière de droits.
 *
 * `GET /iam/me` remplace l'ancien `GET /iam/users`, qui rapatriait la table entière
 * des comptes — avec les droits de chacun — à chaque requête et sans cache. Surtout,
 * l'API et l'admin dérivent désormais les permissions du même code, donc ne peuvent
 * plus diverger sur ce qu'un rôle accorde.
 */
async function fetchActor(env: Record<string, string>, email: string): Promise<ActorDto | null> {
  // Même normalisation que l'API (`normalizeEmail`) : deux casses d'une même adresse
  // résolvent le même compte, elles ne doivent pas occuper deux entrées.
  const cle = email.trim().toLowerCase();
  const maintenant = Date.now();

  const gardee = acteursGardes.get(cle);
  if (gardee && gardee.expireA > maintenant) return gardee.acteur;

  const api = createApiClient(env as never, { caller: 'admin', userEmail: email });
  const res = await api.fetch('http://localhost/iam/me');
  // Une erreur n'est jamais gardée : elle remonte, et le repli de développement comme le
  // 500 de production se décident en aval, sur une réponse fraîche.
  if (!res.ok) throw new Error(`[auth] /iam/me a répondu ${res.status}`);
  const json = (await res.json()) as { data: ActorDto | null };
  const acteur = json.data ?? null;

  // Les comptes inconnus sont gardés eux aussi : sans cela, une adresse sans compte
  // — le cas d'un lien partagé — coûterait un appel de service par requête.
  if (acteursGardes.size >= ACTEUR_MAX_ENTREES) {
    // Borne mémoire : la plus anciennement insérée part en premier.
    const plusAncienne = acteursGardes.keys().next().value;
    if (plusAncienne !== undefined) acteursGardes.delete(plusAncienne);
  }
  acteursGardes.set(cle, { acteur, expireA: maintenant + ACTEUR_TTL_MS });

  return acteur;
}

/**
 * Refus de page : une impasse, mais avec une porte.
 *
 * Le refus rendait un `Response('Accès refusé')` en texte brut, sans rien pour en
 * sortir. On y tombe pourtant sans l'avoir cherché — en empruntant une identité depuis
 * une page que celle-ci n'a pas le droit d'ouvrir, par exemple : l'écran se remplaçait
 * par ces deux mots, et il fallait connaître le bouton « précédent » pour s'en tirer.
 *
 * Le tableau de bord est joignable par construction : `dashboard:overview:read` fait
 * partie du socle réimposé à tout rôle. C'est donc toujours une sortie valable.
 */
function refusedPage(email: string): Response {
  const safeEmail = email.replace(/[<>&"]/g, '');
  return new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` +
      `<title>Accès refusé</title>` +
      `<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;` +
      `font-family:system-ui,sans-serif;background:#faf9f5;color:#3d3929;padding:2rem;text-align:center}` +
      `main{max-width:32rem}h1{font-size:1.25rem;margin:0 0 .75rem}p{margin:0 0 1.5rem;line-height:1.5;color:#6e6d68}` +
      `a{display:inline-block;padding:.625rem 1.25rem;border-radius:.5rem;background:#c96442;color:#fff;` +
      `text-decoration:none;font-weight:600}` +
      `@media(prefers-color-scheme:dark){body{background:#262624;color:#f1f1ef}p{color:#b7b5a9}}</style>` +
      `</head><body><main>` +
      `<h1>Cette page n'est pas accessible à ce compte</h1>` +
      `<p>Vous la consultez en tant que ${safeEmail}. Ce compte n'a pas le droit ` +
      `nécessaire à cet écran.</p>` +
      `<a href="/">Retour au tableau de bord</a>` +
      `</main></body></html>`,
    { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

/** Acteur de secours en développement, pour exercer un rôle sans compte en base. */
function devActor(email: string, role: Role): ActorDto {
  return {
    id: 0,
    email,
    name: email.split('@')[0],
    roles: [role],
    permissions: [...resolvePermissions([role])]
  };
}

export const handleAuth = async (context: APIContext, next: MiddlewareNext) => {
  const request = context.request;
  const env = resolveEnv(context);

  let email: string;

  if (import.meta.env.DEV) {
    // En développement, on saute la vérification Cloudflare Access, mais **pas**
    // l'autorisation : le chemin d'application est identique à la production. C'est
    // précisément parce que l'ancien mode DEV court-circuitait tout — avec un repli
    // sur tous les droits — que des pages sans garde sont passées inaperçues.
    email = readCookie(request, 'impersonate_email') || env.DEV_EMAIL || 'admin@nozaybad.fr';
  } else {
    const token = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!token) {
      return new Response('Non autorisé. Authentification Cloudflare Access requise.', { status: 401 });
    }

    const CF_TEAM_DOMAIN = env.CF_TEAM_DOMAIN;
    const CF_AUDIENCE = env.CF_AUDIENCE;

    // Échec immédiat : une audience absente ferait accepter tout jeton Access valide,
    // quelle qu'en soit l'application d'origine.
    if (!CF_TEAM_DOMAIN || !CF_AUDIENCE) {
      console.error('[auth] CF_TEAM_DOMAIN ou CF_AUDIENCE non configuré');
      return new Response('Erreur de configuration serveur.', { status: 500 });
    }

    try {
      const { payload } = await jwtVerify(token, getJWKS(CF_TEAM_DOMAIN), {
        audience: CF_AUDIENCE,
        issuer: CF_TEAM_DOMAIN
      });
      email = payload.email as string;
    } catch (err) {
      console.error('[auth] jeton invalide :', err);
      return new Response('Authentification invalide ou expirée.', { status: 403 });
    }
  }

  let actor: ActorDto | null = null;
  try {
    actor = await fetchActor(env, email);
  } catch (err) {
    // En production, ne rien inventer : sans réponse de l'API, on ne sait pas quels
    // droits appliquer, et deviner serait précisément la faute à éviter.
    if (!import.meta.env.DEV) {
      console.error('[auth] résolution du compte impossible :', err);
      return new Response("Erreur lors de la communication avec l'API IAM.", { status: 500 });
    }
    // En développement seulement, et uniquement si l'API est *injoignable* (Worker
    // non démarré, clé absente) : on se replie sur un rôle explicite pour ne pas
    // bloquer le travail en cours.
    //
    // Le repli ne couvre surtout pas le cas d'une API qui répond « compte inconnu » :
    // ce serait une identité que l'admin s'accorde à lui-même et que l'API refuse
    // ensuite sur chaque appel. Les pages s'afficheraient, mais tous leurs
    // chargements de données échoueraient en 403 — un état à moitié fonctionnel,
    // bien plus déroutant qu'un refus franc.
    console.warn('[auth] API IAM injoignable ; repli sur DEV_ROLE :', err);
    const devRole = env.DEV_ROLE;
    actor = devActor(email, isRole(devRole || '') ? (devRole as Role) : 'super_admin');
  }

  if (!actor) {
    // L'API a répondu, et cette adresse n'a pas de compte : même message qu'en
    // production, en développement comme ailleurs.
    return new Response(
      import.meta.env.DEV
        ? `Accès refusé. Aucun compte pour ${email}.\n\n` +
          `Utilisez une adresse déjà enregistrée (DEV_EMAIL=...), ou créez ce compte.`
        : 'Accès refusé. Compte non configuré.',
      { status: 403 }
    );
  }

  const realActor = actor;

  // Usurpation : réservée au droit `iam:sessions:impersonate`, revérifié à chaque
  // requête sur l'identité *réelle*. Le cookie seul n'accorde donc rien, et le
  // révoquer du rôle coupe l'usurpation en cours.
  // Hors préproduction, le cookie est inerte : un jeton qui traînerait d'un environnement
  // à l'autre n'ouvre rien. C'est ici que la garde compte — masquer le menu ne serait
  // qu'un décor.
  const impersonated = impersonationEnabled() ? readCookie(request, 'impersonate_email') : null;
  if (impersonated && impersonated !== realActor.email && can(realActor.permissions, 'iam:sessions:impersonate')) {
    try {
      const target = await fetchActor(env, impersonated);
      // Jamais vers un super administrateur : l'usurpation sert à reproduire ce que
      // voit un utilisateur, pas à contourner une limite de droits.
      if (target && !target.roles.includes('super_admin')) actor = target;
    } catch (err) {
      console.error('[auth] usurpation impossible :', err);
    }
  }

  context.locals.user = {
    email: actor.email,
    name: actor.name,
    roles: actor.roles.length ? actor.roles : [DEFAULT_ROLE],
    permissions: actor.permissions
  };
  // Les droits *réels* voyagent avec l'identité réelle : c'est sur eux, et jamais sur
  // ceux de l'identité empruntée, que se décide la prise ou l'abandon d'une usurpation.
  context.locals.realUser = {
    email: realActor.email,
    name: realActor.name,
    permissions: realActor.permissions
  };

  // Autorisation de page, fermée par défaut : une page non déclarée dans
  // PAGE_PERMISSIONS est refusée, y compris si personne n'a pensé à la garder.
  const pathname = new URL(request.url).pathname;
  if (isPageRoute(pathname)) {
    /*
      Une écriture visant une page qui n'en déclare pas est refusée en 405.

      Sans ce refus, Astro rend le HTML de la page avec un 200, et le composant qui l'a
      postée annonce un succès pour une écriture qui n'a pas eu lieu — le défaut le plus
      coûteux de la conversion en coquilles, parce qu'il ne laisse aucune trace.
    */
    if (!accepteEcriture(pathname, request.method)) {
      console.warn(`[écriture] ${request.method} vers une page sans gestionnaire : ${pathname}`);
      return new Response(
        "Cette page n'accepte pas d'écriture. Le composant vise sans doute la page au lieu de son relais.",
        { status: 405, headers: { Allow: 'GET, HEAD' } }
      );
    }

    const pattern = matchPagePattern(pathname);
    if (!pattern) {
      console.warn(`[auth] page non déclarée dans PAGE_PERMISSIONS : ${pathname}`);
      return refusedPage(actor.email);
    }
    const required = PAGE_PERMISSIONS[pattern];
    if (required !== null && !can(actor.permissions, required)) {
      return refusedPage(actor.email);
    }
  }

  return next();
};

// M-03 : toutes les réponses reçoivent les en-têtes de sécurité.
export const onRequest = defineMiddleware(async (context, next) => {
  /*
   * Une page figée ne passe pas par ici — sauf **au build**, où Astro exécute le
   * middleware pour la rendre.
   *
   * Sans cette sortie, `handleAuth` s'exécutait sans jeton Cloudflare Access et refusait :
   * c'est son refus qui était gravé dans le fichier statique, et « Non autorisé » aurait
   * été servi à tout le monde, indéfiniment. Le fichier produit faisait 58 octets.
   *
   * Rien n'est perdu à l'exécution : ces pages ne portent aucune donnée, Access filtre
   * l'hôte en amont des actifs, et leurs en-têtes de sécurité viennent de `_headers`.
   */
  if (context.isPrerendered) return next();

  return applySecurityHeaders(await handleAuth(context, next));
});
