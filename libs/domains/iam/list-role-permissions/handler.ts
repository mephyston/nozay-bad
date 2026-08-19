import { type Db } from '@nba/db';
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from '../shared/roles';
import {
  buildRolePermissionMap,
  driftFromDefaults,
  isEditableRole
} from '../shared/role-permissions';
import { GetActorRepository } from '../get-actor/repository';
import type { RoleSummary } from './dto';

/**
 * Droits de chaque rôle, tels qu'appliqués, accompagnés de leur écart avec la
 * définition d'origine.
 *
 * L'écart n'est pas un détail d'affichage : tant que le mapping vivait en code, git
 * disait qui avait changé quoi et pourquoi. Le montrer ici évite qu'une dérive
 * s'installe sans que personne ne la remarque.
 */
export async function listRolePermissions(db: Db): Promise<RoleSummary[]> {
  const repo = new GetActorRepository();
  const map = buildRolePermissionMap(await repo.listRolePermissions(db));

  return ROLES.map((role) => {
    const permissions = [...(map.get(role) ?? [])].sort();
    const editable = isEditableRole(role);
    const drift = editable
      ? driftFromDefaults(role, map.get(role) ?? new Set())
      : { added: [], removed: [] };

    return {
      role,
      label: ROLE_LABELS[role],
      description: ROLE_DESCRIPTIONS[role],
      permissions,
      editable,
      added: drift.added,
      removed: drift.removed
    };
  });
}
