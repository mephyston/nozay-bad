import { type Db } from '@nba/db';
import { type Role, isRole } from '../shared/roles';
import {
  buildRolePermissionMap,
  permissionsForRoles,
  type RolePermissionMap
} from '../shared/role-permissions';
import { GetActorRepository } from './repository';
import { normalizeEmail, type Actor } from './dto';

/**
 * Plan des droits par rôle, mis en cache à l'échelle de l'isolate.
 *
 * `role_permissions` est lue **en entier** à chaque résolution d'identité — la
 * requête `select role, permission from role_permissions` était, mesurée sur la
 * production, le premier poste de lecture D1 du compte : 53 000 lignes par jour pour
 * une table de 157 lignes que seul un écran d'administration modifie.
 *
 * Le TTL est volontairement plus long que les 30 s du cache d'acteur
 * (`apps/api/src/authz/actor.ts`), parce que ce qu'il garde change bien plus rarement :
 * l'appartenance d'un compte à un rôle se retouche au fil de l'eau, le plan des droits
 * d'un rôle presque jamais. `invalidateRolePermissions()` rend la propagation immédiate
 * dans l'isolate qui écrit — mais, comme pour l'acteur, **la garantie reste le TTL** :
 * ne rien construire qui suppose une invalidation globale.
 */
const ROLE_PERMISSIONS_TTL_MS = 5 * 60_000;

let rolePermissionsCache: { map: RolePermissionMap; expiresAt: number } | null = null;

/** À appeler après toute écriture sur `role_permissions`. */
export function invalidateRolePermissions(): void {
  rolePermissionsCache = null;
}

async function rolePermissionMap(
  db: Db,
  repo: GetActorRepository,
  now: number
): Promise<RolePermissionMap> {
  if (rolePermissionsCache && rolePermissionsCache.expiresAt > now) {
    return rolePermissionsCache.map;
  }
  const map = buildRolePermissionMap(await repo.listRolePermissions(db));
  rolePermissionsCache = { map, expiresAt: now + ROLE_PERMISSIONS_TTL_MS };
  return map;
}

/**
 * Résout une adresse en identité et droits effectifs.
 *
 * Les droits de chaque rôle viennent de la base, où ils sont modifiables ; seul
 * `super_admin` reste calculé en code (voir `role-permissions.ts`).
 *
 * C'est le point d'entrée unique de l'autorisation : l'API comme l'application admin
 * passent par ici, donc les deux ne peuvent pas diverger sur ce qu'un compte a le
 * droit de faire. Un compte inconnu renvoie `null` — jamais un acteur aux droits
 * vides, qui masquerait la distinction entre « compte absent » et « compte sans
 * rôle » au moment de choisir le message d'erreur.
 */
export async function getActor(
  db: Db,
  email: string,
  now: number = Date.now()
): Promise<Actor | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const repo = new GetActorRepository();
  const row = await repo.findByEmail(db, normalized);
  if (!row) return null;

  const map = await rolePermissionMap(db, repo, now);

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    roles: row.roles.filter((r): r is Role => isRole(r)),
    permissions: permissionsForRoles(map, row.roles)
  };
}
