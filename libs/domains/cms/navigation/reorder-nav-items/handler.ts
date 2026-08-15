import { type Db } from '@nba/db';
import { CmsNavItemNotFoundError, CmsNavTargetError } from '../../shared/errors';
import { bumpContentVersion } from '../../shared/cache-version';
import { ReorderNavItemsRepository } from './repository';
import type { ReorderNavItemsInput, ReorderNavItemsOutput } from './dto';

/**
 * Renumérote une fratrie d'entrées.
 *
 * L'ordre reçu fait foi : les positions sont réécrites de 0 à n dans un seul lot, ce
 * qui évite les trous et les doublons qu'un échange deux à deux finit toujours par
 * laisser. Toutes les entrées doivent partager le même parent et le même emplacement,
 * sans quoi la renumérotation mélangerait deux listes.
 */
export async function reorderNavItems(
  db: Db,
  input: ReorderNavItemsInput
): Promise<ReorderNavItemsOutput> {
  const repo = new ReorderNavItemsRepository();

  const rows = await repo.findMany(db, input.ids);
  if (rows.length !== input.ids.length) throw new CmsNavItemNotFoundError();

  const [first] = rows;
  const sameFamily = rows.every(
    (row) => row.location === first.location && row.parentId === first.parentId
  );
  if (!sameFamily) {
    throw new CmsNavTargetError("Seules des entrées d'un même niveau peuvent être réordonnées ensemble.");
  }

  await db.batch(repo.buildPositionStatements(db, input.ids) as never);

  // Les menus sont rendus sur **toutes** les pages : sans invalidation, une entrée
  // ajoutée ou renommée resterait invisible jusqu'à expiration du cache du bord — une
  // heure — et l'on croirait l'enregistrement perdu.
  await bumpContentVersion(db);
  return { reordered: input.ids.length };
}
