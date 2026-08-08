import type { MiddlewareHandler } from 'hono';
import { createDb } from '@nba/db';
import { can } from '@nba/iam';
import { matchRule } from './matcher';
import { resolveActor } from './actor';

export type AuthzBindings = {
  DB: D1Database;
  /**
   * `log` n'applique rien et journalise ce qui *serait* refusé : mode de répétition,
   * à n'utiliser que le temps d'une observation sur un environnement de recette.
   * Toute autre valeur, y compris l'absence de valeur, applique les refus.
   */
  RBAC_ENFORCE?: string;
};

/** Chemins traités avant l'autorisation (sonde de disponibilité). */
const EXEMPT_PATHS = new Set(['/health']);

function deny(
  c: Parameters<MiddlewareHandler>[0],
  status: 401 | 403,
  message: string,
  reason: string,
  enforcing: boolean
) {
  const method = c.req.method;
  const path = c.req.path;
  if (!enforcing) {
    console.warn(`[authz] REFUS SIMULÉ ${method} ${path} — ${reason}`);
    return undefined;
  }
  console.warn(`[authz] refus ${method} ${path} — ${reason}`);
  return c.json({ success: false, error: message }, status);
}

/**
 * Autorisation de l'API, fermée par défaut.
 *
 * L'API est l'autorité : elle résout elle-même l'identité affirmée par l'appelant
 * (`x-user-email`) en rôles puis en permissions, et n'accepte plus de liste de
 * permissions toute faite. Un en-tête qui transporte une *décision* d'autorisation
 * plutôt qu'une *identité* fait vivre la logique de droits dans deux bases de code,
 * et suffit à escalader dès qu'un proxy oublie de nettoyer les en-têtes entrants.
 *
 * L'identité est digne de foi parce que la couche de transport l'est : l'API rejette
 * toute requête sans `INTERNAL_API_KEY`, un secret que seuls les Workers admin et
 * storefront détiennent — le navigateur ne l'atteint jamais directement. `x-caller`
 * distingue les deux appelants ; comme ils partagent la même clé, il prévient une
 * erreur de câblage, pas un pair compromis. Des clés par appelant seraient le
 * durcissement suivant.
 */
export function authorize(): MiddlewareHandler<{ Bindings: AuthzBindings }> {
  return async (c, next) => {
    if (EXEMPT_PATHS.has(c.req.path)) return next();

    const enforcing = (c.env?.RBAC_ENFORCE || 'enforce') !== 'log';
    const rule = matchRule(c.req.method, c.req.path);

    if (!rule) {
      // Route non déclarée : elle n'existe pas, ou elle a été ajoutée sans règle.
      // Le test de couverture rend le second cas impossible à fusionner, mais le
      // refus reste le comportement correct à l'exécution.
      const res = deny(c, 403, 'Accès refusé', 'route non déclarée dans ROUTE_PERMISSIONS', enforcing);
      return res ?? next();
    }

    const caller = c.req.header('x-caller') || '';

    if (caller === 'storefront') {
      if (!rule.service) {
        const res = deny(c, 403, 'Accès refusé', 'route interdite au storefront', enforcing);
        return res ?? next();
      }
      return next();
    }

    if (caller !== 'admin') {
      const res = deny(c, 403, 'Accès refusé', `appelant inconnu : « ${caller} »`, enforcing);
      return res ?? next();
    }

    const email = c.req.header('x-user-email') || '';
    if (!email) {
      // L'appelant admin est authentifié mais n'affirme aucune identité : c'est un
      // défaut de câblage du proxy, pas un refus métier. On échoue bruyamment.
      const res = deny(c, 401, 'Identité appelante absente', 'x-user-email absent', enforcing);
      return res ?? next();
    }

    if (!c.env?.DB) {
      console.error('[authz] binding DB absent : impossible de résoudre les droits');
      return c.json({ success: false, error: 'Erreur de configuration serveur' }, 500);
    }

    const actor = await resolveActor(createDb(c.env.DB), email);
    if (!actor) {
      // `/iam/me` doit pouvoir répondre pour une adresse sans compte : c'est elle qui
      // crée le premier administrateur, et elle seule porte cette exemption.
      if (rule.allowUnknownActor) return next();
      // 403 et non 401 : le transport *est* authentifié, c'est le compte qui n'existe pas.
      const res = deny(c, 403, 'Accès refusé. Compte non configuré.', `compte inconnu : ${email}`, enforcing);
      return res ?? next();
    }

    if (rule.permission !== null && !can(actor.permissions, rule.permission)) {
      const res = deny(
        c,
        403,
        'Accès refusé',
        `${actor.email} [${actor.roles.join(',') || 'aucun rôle'}] n'a pas ${rule.permission}`,
        enforcing
      );
      return res ?? next();
    }

    return next();
  };
}
