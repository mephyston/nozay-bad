import { type Db } from '@nba/db';
import { parseStoredBlock } from '../../shared/block-payload';
import { CmsPageNotFoundError } from '../../shared/errors';
import { GetPageRepository } from './repository';
import type { GetPageInput, GetPageOutput } from './dto';

/** Une page et ses blocs, pour l'édition. Le site public passe par `resolveRoute`. */
export async function getPage(db: Db, input: GetPageInput): Promise<GetPageOutput> {
  const repo = new GetPageRepository();

  const page = await repo.findById(db, input.pageId);
  if (!page) throw new CmsPageNotFoundError();

  const rows = await repo.findBlocks(db, page.id);
  const blocks = rows
    .map((row) => parseStoredBlock(row.type, row.payload))
    .filter((block): block is NonNullable<typeof block> => block !== null);

  return { page, blocks };
}
