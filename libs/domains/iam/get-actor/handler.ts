import { type Db } from '@nba/db';
import { resolvePermissions, type Role, isRole } from '../shared/roles';
import { GetActorRepository } from './repository';
import { normalizeEmail, type Actor } from './dto';

/**
 * Résout une adresse en identité et droits effectifs.
 *
 * C'est le point d'entrée unique de l'autorisation : l'API comme l'application admin
 * passent par ici, donc les deux ne peuvent pas diverger sur ce qu'un compte a le
 * droit de faire. Un compte inconnu renvoie `null` — jamais un acteur aux droits
 * vides, qui masquerait la distinction entre « compte absent » et « compte sans
 * rôle » au moment de choisir le message d'erreur.
 */
export async function getActor(db: Db, email: string): Promise<Actor | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const repo = new GetActorRepository();
  const row = await repo.findByEmail(db, normalized);
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    roles: row.roles.filter((r): r is Role => isRole(r)),
    permissions: resolvePermissions(row.roles)
  };
}
