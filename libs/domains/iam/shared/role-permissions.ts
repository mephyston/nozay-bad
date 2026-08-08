import { ALL_PERMISSIONS, isPermission, type Permission } from './permissions';
import { isRole, ROLE_PERMISSIONS, type Role } from './roles';

/** Rôles dont les droits sont modifiables depuis l'application. */
export const EDITABLE_ROLES: readonly Role[] = Object.freeze(
  (Object.keys(ROLE_PERMISSIONS) as Role[]).filter((r) => r !== 'super_admin')
);

/**
 * `super_admin` n'est pas modifiable, et ne l'est pas par oubli.
 *
 * Il vaut toujours la totalité du catalogue, calculée. Figé en base, il n'obtiendrait
 * pas les permissions ajoutées par les fonctionnalités futures — on livrerait un écran
 * que le super administrateur ne peut pas ouvrir — et lui retirer par mégarde son droit
 * d'édition fermerait la gestion des rôles sans recours.
 */
export function isEditableRole(role: string): role is Role {
  return isRole(role) && role !== 'super_admin';
}

export type RolePermissionMap = Map<Role, Set<Permission>>;

/**
 * Construit la table rôle → droits à partir des lignes stockées.
 *
 * `super_admin` est toujours ajouté depuis le code, quoi que contienne la base.
 * Les lignes portant un rôle ou une permission inconnus sont ignorées : un vestige
 * d'une version antérieure doit se traduire par une absence de droit, jamais par un
 * droit accordé.
 */
export function buildRolePermissionMap(
  rows: readonly { role: string; permission: string }[]
): RolePermissionMap {
  const map: RolePermissionMap = new Map();
  for (const role of EDITABLE_ROLES) map.set(role, new Set<Permission>());

  for (const row of rows) {
    if (!isEditableRole(row.role) || !isPermission(row.permission)) continue;
    map.get(row.role)!.add(row.permission);
  }

  map.set('super_admin', new Set<Permission>(ALL_PERMISSIONS));
  return map;
}

/** Union des droits des rôles fournis, d'après la table résolue. */
export function permissionsForRoles(
  map: RolePermissionMap,
  roles: readonly string[]
): Set<Permission> {
  const out = new Set<Permission>();
  for (const role of roles) {
    if (!isRole(role)) continue;
    for (const permission of map.get(role) ?? []) out.add(permission);
  }
  return out;
}

/**
 * Écart entre les droits d'un rôle et sa définition d'origine (celle du code).
 *
 * Le mapping vivait en code, où git donnait gratuitement l'auteur et la raison de
 * chaque changement. Depuis qu'il est modifiable, l'écran a besoin de dire ce qui a
 * été ajouté ou retiré depuis, pour que la dérive reste visible.
 */
export interface RoleDrift {
  added: Permission[];
  removed: Permission[];
}

export function driftFromDefaults(role: Role, current: ReadonlySet<Permission>): RoleDrift {
  const defaults = new Set<Permission>(ROLE_PERMISSIONS[role]);
  return {
    added: [...current].filter((p) => !defaults.has(p)).sort(),
    removed: [...defaults].filter((p) => !current.has(p)).sort()
  };
}
