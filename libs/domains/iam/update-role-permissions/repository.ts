import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { rolePermissionsTable, rolePermissionLogTable } from '../shared/schema';

/**
 * Plafond de variables liées d'une requête D1.
 *
 * Une écriture multi-lignes consomme une variable par colonne et par ligne : passé ce
 * seuil, D1 refuse la requête entière. Le nombre de droits d'un rôle n'est borné que
 * par la taille du catalogue, qui grandit à chaque fonctionnalité — l'insertion en une
 * seule requête était donc condamnée à casser un jour, pour les rôles les plus dotés
 * d'abord.
 *
 * Constaté en production le 2026-08-15 : un rôle passé à 34 droits demandait 102
 * variables et rendait la page des rôles inutilisable, avec une erreur 500 opaque. Les
 * rôles moins pourvus continuaient de fonctionner, ce qui a d'abord fait croire à un
 * problème d'environnement.
 */
const MAX_BOUND_PARAMS = 100;

/** Découpe une liste en lots d'au plus `size` éléments. */
function chunk<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

export class UpdateRolePermissionsRepository {
  async listForRole(db: DbOrTx, role: string): Promise<string[]> {
    const rows = await db
      .select({ permission: rolePermissionsTable.permission })
      .from(rolePermissionsTable)
      .where(eq(rolePermissionsTable.role, role))
      .all();
    return rows.map((r) => r.permission);
  }

  /**
   * Remplace les droits d'un rôle, et journalise, **en un seul lot**.
   *
   * Les instructions sont rendues à l'appelant plutôt qu'exécutées ici : D1 n'a pas de
   * transaction interactive, et seul `db.batch()` garantit que la suppression et les
   * insertions réussissent ou échouent ensemble. Les exécuter à la suite laisserait, sur
   * une panne au milieu, un rôle amputé d'une partie de ses droits — c'est-à-dire un
   * utilisateur soudain privé d'écrans, sans trace de la cause.
   */
  buildReplaceStatements(
    db: DbOrTx,
    role: string,
    permissions: string[],
    now: Date,
    log: { entries: LogEntry[]; actorEmail: string }
  ): unknown[] {
    const statements: unknown[] = [
      db.delete(rolePermissionsTable).where(eq(rolePermissionsTable.role, role))
    ];

    // 3 colonnes écrites par ligne : `id` est laissé à l'auto-incrément et ne consomme
    // pas de variable.
    for (const batch of chunk(permissions, Math.floor(MAX_BOUND_PARAMS / 3))) {
      statements.push(
        db
          .insert(rolePermissionsTable)
          .values(batch.map((permission) => ({ role, permission, createdAt: now })))
      );
    }

    // 5 colonnes par ligne au journal.
    for (const batch of chunk(log.entries, Math.floor(MAX_BOUND_PARAMS / 5))) {
      statements.push(
        db
          .insert(rolePermissionLogTable)
          .values(batch.map((e) => ({ ...e, actorEmail: log.actorEmail, createdAt: now })))
      );
    }

    return statements;
  }
}

/** Journal en ajout seul : il remplace la trace que git donnait gratuitement. */
export interface LogEntry {
  role: string;
  permission: string;
  action: 'granted' | 'revoked';
}
