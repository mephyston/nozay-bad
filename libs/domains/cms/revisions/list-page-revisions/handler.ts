import { type Db } from '@nba/db';
import { ListPageRevisionsRepository } from './repository';
import type { ListPageRevisionsInput, ListPageRevisionsOutput } from './dto';

export async function listPageRevisions(
  db: Db,
  input: ListPageRevisionsInput
): Promise<ListPageRevisionsOutput> {
  const rows = await new ListPageRevisionsRepository().list(db, input.pageId);
  return rows.map((row) => {
    let blockCount = 0;
    try {
      blockCount = (JSON.parse(row.snapshot).blocks ?? []).length;
    } catch {
      // Instantané illisible : on l'affiche quand même, la restauration le refusera.
    }
    return {
      id: row.id,
      revision: row.revision,
      authorEmail: row.authorEmail,
      reason: row.reason,
      createdAt: row.createdAt,
      blockCount
    };
  });
}
