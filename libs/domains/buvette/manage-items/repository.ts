import { asc, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { buvetteItemsTable } from '../shared/schema';
import type { SaveItemInput } from './dto';

export class ManageItemsRepository {
  list(db: DbOrTx) {
    return db.select().from(buvetteItemsTable).orderBy(asc(buvetteItemsTable.sortOrder), asc(buvetteItemsTable.name)).all();
  }

  create(db: DbOrTx, input: SaveItemInput) {
    return db.insert(buvetteItemsTable).values({ ...input, createdAt: new Date() }).returning().get();
  }

  update(db: DbOrTx, id: number, input: SaveItemInput) {
    return db.update(buvetteItemsTable).set(input).where(eq(buvetteItemsTable.id, id)).returning().get();
  }
}
