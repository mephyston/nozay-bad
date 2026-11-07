import { and, desc, eq, ne, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { buvetteCardDevicesTable, buvetteCardMovementsTable, buvetteCardsTable, buvetteOrdersTable, buvetteSaleLinesTable, buvetteSalesTable } from '../shared/schema';

export class CardWalletRepository {
  movements(db: DbOrTx, cardId: number) {
    return db
      .select({
        id: buvetteCardMovementsTable.id,
        type: buvetteCardMovementsTable.type,
        amountCents: buvetteCardMovementsTable.amountCents,
        createdAt: buvetteCardMovementsTable.createdAt
      })
      .from(buvetteCardMovementsTable)
      .where(eq(buvetteCardMovementsTable.cardId, cardId))
      .orderBy(desc(buvetteCardMovementsTable.id))
      .limit(30)
      .all();
  }

  /** L'historique comptable reste, sans l'adresse. Le filtre écarte une recharge arrivée entre-temps. */
  buildForgetStatement(db: DbOrTx, cardId: number): any {
    return db.update(buvetteCardsTable)
      .set({ email: `supprime-${cardId}@carte.invalid`, deletedAt: new Date() })
      .where(and(eq(buvetteCardsTable.id, cardId), eq(buvetteCardsTable.balanceCents, 0), eq(buvetteCardsTable.reservedCents, 0)));
  }

  buildCancelOrdersStatement(db: DbOrTx, cardId: number): any {
    return db.update(buvetteOrdersTable).set({ status: 'cancelled' })
      .where(and(eq(buvetteOrdersTable.cardId, cardId), eq(buvetteOrdersTable.status, 'pending')));
  }

  buildRevokeAllStatement(db: DbOrTx, cardId: number): any {
    return db.update(buvetteCardDevicesTable)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(buvetteCardDevicesTable.cardId, cardId),
        sql`${buvetteCardDevicesTable.revokedAt} IS NULL`,
        sql`EXISTS (SELECT 1 FROM ${buvetteCardsTable} WHERE ${buvetteCardsTable.id} = ${cardId} AND ${buvetteCardsTable.balanceCents} = 0)`
      ));
  }

  /** Filtré sur la carte : un appareil ne lit jamais le mouvement d'une autre. */
  movement(db: DbOrTx, cardId: number, id: number) {
    return db.select().from(buvetteCardMovementsTable)
      .where(and(eq(buvetteCardMovementsTable.id, id), eq(buvetteCardMovementsTable.cardId, cardId)))
      .get();
  }

  sale(db: DbOrTx, saleId: number) {
    return db.select().from(buvetteSalesTable).where(eq(buvetteSalesTable.id, saleId)).get();
  }

  saleLines(db: DbOrTx, saleId: number) {
    return db
      .select({ name: buvetteSaleLinesTable.name, quantity: buvetteSaleLinesTable.quantity, unitPriceCents: buvetteSaleLinesTable.unitPriceCents })
      .from(buvetteSaleLinesTable)
      .where(eq(buvetteSaleLinesTable.saleId, saleId))
      .all();
  }

  revokeOthers(db: DbOrTx, cardId: number, keepDeviceId: string) {
    return db.update(buvetteCardDevicesTable)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(buvetteCardDevicesTable.cardId, cardId),
        ne(buvetteCardDevicesTable.id, keepDeviceId),
        sql`${buvetteCardDevicesTable.revokedAt} IS NULL`
      ));
  }
}
