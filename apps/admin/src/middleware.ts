import { defineMiddleware } from 'astro:middleware';
import type { APIContext, MiddlewareNext } from 'astro';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { createApiClient } from '@nba/api-client';
import { resolveEnv as resolveRuntimeEnv } from '@nba/runtime-env';
import { can, resolvePermissions, isRole, DEFAULT_ROLE, type ActorDto, type Role } from '@nba/iam-ui';
import { applySecurityHeaders } from './lib/security-headers';
import { PAGE_PERMISSIONS, matchPagePattern, isPageRoute } from './lib/page-permissions';

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
 * Résout un compte via l'API, qui est l'autorité en matière de droits.
 *
 * `GET /iam/me` remplace l'ancien `GET /iam/users`, qui rapatriait la table entière
 * des comptes — avec les droits de chacun — à chaque requête et sans cache. Surtout,
 * l'API et l'admin dérivent désormais les permissions du même code, donc ne peuvent
 * plus diverger sur ce qu'un rôle accorde.
 */
async function fetchActor(env: Record<string, string>, email: string): Promise<ActorDto | null> {
  const api = createApiClient(env as never, { caller: 'admin', userEmail: email });
  const res = await api.fetch('http://localhost/iam/me');
  if (!res.ok) throw new Error(`[auth] /iam/me a répondu ${res.status}`);
  const json = (await res.json()) as { data: ActorDto | null };
  return json.data ?? null;
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
  const impersonated = readCookie(request, 'impersonate_email');
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
  context.locals.realUser = { email: realActor.email, name: realActor.name };

  // Autorisation de page, fermée par défaut : une page non déclarée dans
  // PAGE_PERMISSIONS est refusée, y compris si personne n'a pensé à la garder.
  const pathname = new URL(request.url).pathname;
  if (isPageRoute(pathname)) {
    const pattern = matchPagePattern(pathname);
    if (!pattern) {
      console.warn(`[auth] page non déclarée dans PAGE_PERMISSIONS : ${pathname}`);
      return new Response('Accès refusé', { status: 403 });
    }
    const required = PAGE_PERMISSIONS[pattern];
    if (required !== null && !can(actor.permissions, required)) {
      return new Response('Accès refusé', { status: 403 });
    }
  }

  return next();
};

// M-03 : toutes les réponses reçoivent les en-têtes de sécurité.
export const onRequest = defineMiddleware(async (context, next) => {
  return applySecurityHeaders(await handleAuth(context, next));
});
