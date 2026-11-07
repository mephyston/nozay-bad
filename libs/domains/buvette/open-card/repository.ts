import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { buvetteCardDevicesTable, buvetteCardsTable } from '../shared/schema';

export class OpenCardRepository {
  findByEmail(db: DbOrTx, email: string) {
    return db.select().from(buvetteCardsTable).where(eq(buvetteCardsTable.email, email)).get();
  }

  /** Deux appareils qui créent la même carte en même temps tombent sur la même ligne. */
  createCard(db: DbOrTx, email: string) {
    return db.insert(buvetteCardsTable).values({ email, balanceCents: 0, createdAt: new Date() })
      .onConflictDoNothing({ target: buvetteCardsTable.email })
      .returning().get();
  }

  addDevice(db: DbOrTx, cardId: number, id: string) {
    return db.insert(buvetteCardDevicesTable).values({ id, cardId, createdAt: new Date() }).returning().get();
  }
}
