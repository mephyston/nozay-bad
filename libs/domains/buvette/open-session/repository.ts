import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { buvetteSessionsTable } from '../shared/schema';

export class OpenSessionRepository {
  create(db: DbOrTx, values: { businessDate: string; openingFloatCents: number; accountingCategoryId: number; openedByEmail: string }) {
    return db.insert(buvetteSessionsTable).values({ ...values, status: 'open', openedAt: new Date() }).returning().get();
  }

  /** Seulement tant qu'elle est ouverte : clôturée, ses écritures sont déjà passées. */
  setCategory(db: DbOrTx, sessionId: number, accountingCategoryId: number) {
    return db.update(buvetteSessionsTable).set({ accountingCategoryId })
      .where(and(eq(buvetteSessionsTable.id, sessionId), eq(buvetteSessionsTable.status, 'open')))
      .returning().get();
  }
}
