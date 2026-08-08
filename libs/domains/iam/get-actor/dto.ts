import type { Role } from '../shared/roles';
import type { Permission } from '../shared/permissions';

/**
 * Identité résolue d'un compte d'administration, avec ses droits effectifs.
 *
 * `permissions` est un `Set` : c'est la forme utile côté serveur, où chaque contrôle
 * est un `has()`. Pour le transport HTTP, voir `ActorDto`.
 */
export interface Actor {
  id: number;
  email: string;
  name: string;
  roles: Role[];
  permissions: Set<Permission>;
}

/** Forme sérialisable de l'acteur (réponse de `GET /iam/me`, props d'îlot Svelte). */
export interface ActorDto {
  id: number;
  email: string;
  name: string;
  roles: Role[];
  permissions: Permission[];
}

export function toActorDto(actor: Actor): ActorDto {
  return {
    id: actor.id,
    email: actor.email,
    name: actor.name,
    roles: actor.roles,
    permissions: [...actor.permissions]
  };
}

/**
 * Normalise une adresse pour la comparaison.
 *
 * Cloudflare Access renvoie l'adresse telle que déclarée par le fournisseur
 * d'identité, dont la casse peut varier d'une connexion à l'autre. On compare donc
 * toujours sur la forme normalisée, et on ne stocke que celle-ci.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
