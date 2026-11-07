import { type DbOrTx } from '@nba/db';
import { buvetteSessionsTable } from '../shared/schema';

export class OpenSessionRepository {
  create(db: DbOrTx, values: { businessDate: string; openingFloatCents: number; openedByEmail: string }) {
    return db.insert(buvetteSessionsTable).values({ ...values, status: 'open', openedAt: new Date() }).returning().get();
  }
}
