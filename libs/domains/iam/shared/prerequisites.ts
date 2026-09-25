import { type Permission } from './permissions';

/**
 * Prérequis d'une permission : les lectures sans lesquelles l'écran s'ouvre… et reste vide.
 *
 * La garde de page et les gardes de route ne portent pas sur la même chose. Cocher
 * `accounting:reports:read` ouvre l'écran des rapports, mais celui-ci lit encore le
 * référentiel des exercices, celui des catégories et celui des classes de comptes —
 * chacun derrière son propre droit. Sans eux, le compte accède aux écrans sans voir
 * leurs données, et rien à l'écran ne dit lequel manque.
 *
 * Ces prérequis sont des **référentiels en lecture seule** : un code de saison, un
 * libellé de catégorie. Les accorder avec la permission qui les suppose n'ouvre aucune
 * donnée que l'écran ne montrait pas déjà, et c'est le seul moyen qu'un droit coché
 * tienne sa promesse. Même raisonnement que le socle `ALWAYS_GRANTED` : un droit qui
 * n'affiche rien ne rend service à personne.
 *
 * La table se dérive des appels réellement passés par les pages d'administration, et
 * non d'une intention : `roles.test.ts` vérifie que les rôles livrés la respectent.
 */

/** Sélecteur d'exercice, présent sur presque tous les écrans de gestion. */
const SEASONS = ['accounting:seasons:read'] as const;

/** Sélecteur d'exercice **et** référentiels de catégories et de classes de comptes. */
const SEASONS_AND_CONFIG = ['accounting:seasons:read', 'accounting:config:read'] as const;

export const PERMISSION_PREREQUISITES: Partial<Record<Permission, readonly Permission[]>> = {
  // Comptabilité : le grand livre, la banque et les rapports s'intitulent avec les
  // catégories et les classes de comptes.
  'accounting:ledger:read': SEASONS_AND_CONFIG,
  'accounting:bank:read': SEASONS_AND_CONFIG,
  'accounting:reports:read': SEASONS_AND_CONFIG,
  'accounting:reports:export': SEASONS_AND_CONFIG,
  'accounting:invoices:read': SEASONS,
  // Un chèque s'affecte à une catégorie de recette du plan.
  'accounting:checks:read': SEASONS_AND_CONFIG,
  'accounting:seasons:write': SEASONS,
  'accounting:budget:read': SEASONS,

  // Notes de frais : rapprochées d'un exercice et d'une catégorie.
  'expenses:reports:read': SEASONS_AND_CONFIG,

  // Boutique : les commandes se rattachent à un exercice, le catalogue à des catégories.
  'shop:orders:read': SEASONS,
  'shop:products:read': ['accounting:config:read'],

  // Adhérents : la liste est celle d'une saison.
  'members:members:read': SEASONS,

  // Interclubs : les quatre écrans portent un sélecteur de saison.
  'teams:teams:read': SEASONS,
  'teams:rankings:read': SEASONS,
  'teams:lineups:read': SEASONS
};

/**
 * Ferme un ensemble de permissions sur ses prérequis.
 *
 * La fermeture est transitive : un prérequis qui en aurait lui-même sera tiré à son
 * tour. L'ensemble rendu est toujours nouveau — l'appelant peut le modifier.
 */
export function withPrerequisites(permissions: Iterable<Permission>): Set<Permission> {
  const result = new Set<Permission>(permissions);
  const queue = [...result];

  while (queue.length > 0) {
    const permission = queue.pop() as Permission;
    for (const required of PERMISSION_PREREQUISITES[permission] ?? []) {
      if (!result.has(required)) {
        result.add(required);
        queue.push(required);
      }
    }
  }

  return result;
}

/** Prérequis manquants d'un ensemble, pour les nommer plutôt que les deviner. */
export function missingPrerequisites(permissions: Iterable<Permission>): Permission[] {
  const granted = new Set<Permission>(permissions);
  const missing = new Set<Permission>();

  for (const permission of granted) {
    for (const required of PERMISSION_PREREQUISITES[permission] ?? []) {
      if (!granted.has(required)) missing.add(required);
    }
  }

  return [...missing].sort();
}
