import { hasPermission } from '@nba/iam';

/**
 * Autorisation du proxy comptable (H-01 de l'audit sécurité).
 *
 * Le proxy `/api/accounting/[...path]` est un catch-all atteignable par le client :
 * sans contrôle, tout admin authentifié (même sans droit comptable) pourrait appeler
 * directement une écriture (DELETE /api/accounting/invoices/42…). On applique donc une
 * autorisation par méthode + chemin, à partir des permissions réelles (`locals.user`).
 *
 * Modèle de permissions de l'app : `accounting:invoices` (rôle facturation) et
 * `accounting:*` (comptabilité complète) — plus les wildcards gérés par hasPermission.
 */

/** L'utilisateur a-t-il un accès comptable, quel qu'en soit le périmètre ? */
function hasAnyAccounting(perms: string[]): boolean {
  return perms.includes('*') || perms.some((p) => p === 'accounting:*' || p.startsWith('accounting:'));
}

/** Lecture (GET/HEAD/OPTIONS). */
function isReadLike(method: string): boolean {
  const m = method.toUpperCase();
  return m === 'GET' || m === 'HEAD' || m === 'OPTIONS';
}

/**
 * Décide si l'appel proxifié est autorisé.
 * @param method  méthode HTTP
 * @param path    chemin APRÈS `/accounting/` (ex: `invoices/42`, `seasons/25-26/ai/analysis`)
 * @param perms   permissions de l'utilisateur (locals.user.permissions)
 */
export function authorizeAccountingProxy(method: string, path: string, perms: string[]): boolean {
  const p = path.replace(/^\/+/, '');

  // Endpoints IA (analyse / suggestion de budget) : régis par le droit unique « ai:* »,
  // indépendamment des droits comptables.
  if (p.includes('/ai/')) {
    return hasPermission(perms, 'ai:*');
  }

  // Base : aucun accès comptable → refus (bloque l'escalade latérale entre rôles admin).
  if (!hasAnyAccounting(perms)) return false;

  // Lecture : un accès comptable quelconque suffit.
  if (isReadLike(method)) return true;

  // Écriture : la facturation suffit pour /invoices ; le reste exige la compta complète.
  const required = p.startsWith('invoices') ? 'accounting:invoices' : 'accounting:*';
  return hasPermission(perms, required);
}
