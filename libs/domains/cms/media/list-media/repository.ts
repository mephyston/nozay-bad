import { desc } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsMediaTable, type CmsMediaRow } from '../../shared/schema';

export class ListMediaRepository {
  async list(db: DbOrTx, limit: number, offset: number): Promise<CmsMediaRow[]> {
    // Les derniers déposés d'abord : c'est ce qu'on cherche en ouvrant la médiathèque.
    return db.select().from(cmsMediaTable).orderBy(desc(cmsMediaTable.createdAt)).limit(limit).offset(offset).all();
  }
}
