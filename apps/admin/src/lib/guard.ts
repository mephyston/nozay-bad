import { can as canPermission, type Permission } from '@nba/iam-ui';

/** L'utilisateur courant détient-il cette permission ? */
export function can(locals: App.Locals, permission: Permission): boolean {
  return canPermission(locals.user?.permissions ?? [], permission);
}

export function forbidden(message = 'Accès refusé'): Response {
  return new Response(message, { status: 403 });
}

/**
 * Garde des gestionnaires POST par action.
 *
 * Les pages d'administration reçoivent leurs écritures sous la forme
 * `{ action: 'delete', ... }` : une seule permission par page ne suffit donc pas, la
 * consultation et la suppression arrivant par la même URL.
 *
 * Une action absente de la table est refusée — un nom d'action inventé par le client
 * ne doit jamais atteindre le gestionnaire.
 *
 * Cette couche est de la défense en profondeur et du confort (un refus en français,
 * immédiat, plutôt qu'une erreur remontée de l'API) : le contrôle qui fait autorité
 * reste celui de l'API.
 */
export function guardAction(
  locals: App.Locals,
  action: unknown,
  actions: Record<string, Permission>
): Response | null {
  // `Object.hasOwn` et non `in` : `'constructor' in actions` est vrai par héritage,
  // et laisserait un nom d'action emprunté au prototype franchir cette vérification.
  if (typeof action !== 'string' || !Object.hasOwn(actions, action)) {
    return forbidden('Action inconnue');
  }
  return can(locals, actions[action]) ? null : forbidden();
}

/**
 * L'usurpation d'identité est-elle ouverte dans cet environnement ?
 *
 * C'est un outil de test : elle sert à vérifier ce que voit un rôle, pas à travailler
 * sous le nom d'un autre. En production, agir sous l'identité d'un tiers sur des données
 * personnelles n'apporte rien et pose une question de traçabilité qu'aucune association
 * n'a envie d'avoir à trancher. La capacité y est donc simplement retirée.
 *
 * La valeur est **inlinée au build** (`PUBLIC_APP_ENV`, cf. `apps/admin/astro.config.mjs`)
 * et non lue à l'exécution : elle ne peut pas être basculée après coup sur un worker
 * déployé. Le repli sur « production » suit la convention de `Layout.astro` — en cas de
 * doute, on ferme.
 */
export function impersonationEnabled(): boolean {
  return (import.meta.env.PUBLIC_APP_ENV ?? 'production') !== 'production';
}
