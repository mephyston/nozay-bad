import { type Db, AppError } from '@nba/db';
import { isPermission, type Permission } from '../shared/permissions';
import { withPrerequisites } from '../shared/prerequisites';
import { isRole, type Role } from '../shared/roles';
import { isEditableRole } from '../shared/role-permissions';
import { invalidateRolePermissions } from '../get-actor/handler';
import { UpdateRolePermissionsRepository } from './repository';

export class RoleNotFoundError extends AppError {
  constructor(role: string) {
    super(`Rôle inconnu : ${role}`, 404);
    this.name = 'RoleNotFoundError';
  }
}

export class ImmutableRoleError extends AppError {
  constructor() {
    super(
      "Le rôle « super administrateur » n'est pas modifiable : il détient l'intégralité des droits par construction.",
      400
    );
    this.name = 'ImmutableRoleError';
  }
}

/**
 * Socle réimposé à tout rôle.
 *
 * Un compte privé de son tableau de bord et du centre d'aide ne verrait plus rien
 * après connexion, sans comprendre pourquoi. Ces deux droits n'ouvrent aucune donnée
 * sensible : les retirer n'apporte rien et casse l'application.
 */
const ALWAYS_GRANTED: readonly Permission[] = ['dashboard:overview:read', 'help:docs:read'];

export interface UpdateRolePermissionsResult {
  role: Role;
  permissions: Permission[];
  granted: Permission[];
  revoked: Permission[];
}

export async function updateRolePermissions(
  db: Db,
  role: string,
  permissions: readonly string[],
  actorEmail: string,
  now: Date = new Date()
): Promise<UpdateRolePermissionsResult> {
  if (!isRole(role)) throw new RoleNotFoundError(role);
  // `super_admin` vaut toujours tout le catalogue, calculé en code : le figer en base
  // le priverait des permissions ajoutées par les fonctionnalités futures, et lui
  // retirer son droit d'édition fermerait la gestion des rôles sans recours.
  if (!isEditableRole(role)) throw new ImmutableRoleError();

  const repo = new UpdateRolePermissionsRepository();
  const before = new Set((await repo.listForRole(db, role)).filter(isPermission));

  // Les prérequis suivent les droits qui les supposent : cocher « consulter les
  // rapports financiers » sans le référentiel des exercices donnait un écran qui
  // s'ouvre et reste vide, sans rien dire de ce qui manque.
  const after = withPrerequisites(permissions.filter(isPermission));
  for (const permission of ALWAYS_GRANTED) after.add(permission);

  const granted = [...after].filter((p) => !before.has(p)).sort();
  const revoked = [...before].filter((p) => !after.has(p)).sort();

  if (granted.length > 0 || revoked.length > 0) {
    // Un seul lot : le remplacement des droits et sa trace au journal réussissent ou
    // échouent ensemble. D1 n'offrant pas de transaction interactive, c'est `batch()`
    // qui tient ce rôle — et c'est aussi lui qui permet de découper les insertions
    // sans perdre l'atomicité.
    const statements = repo.buildReplaceStatements(db, role, [...after], now, {
      actorEmail,
      entries: [
        ...granted.map((permission) => ({ role, permission, action: 'granted' as const })),
        ...revoked.map((permission) => ({ role, permission, action: 'revoked' as const }))
      ]
    });
    await db.batch(statements as never);
    // Les droits viennent de changer : le plan mis en cache par `getActor` ne vaut
    // plus rien dans cet isolate. Les autres attendront l'expiration.
    invalidateRolePermissions();
  }

  return { role, permissions: [...after].sort(), granted, revoked };
}
