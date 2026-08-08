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
  if (typeof action !== 'string' || !(action in actions)) {
    return forbidden('Action inconnue');
  }
  return can(locals, actions[action]) ? null : forbidden();
}
