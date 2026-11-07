import { eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { buvetteCardMovementsTable, buvetteCardsTable } from '../shared/schema';

export class PaperCardsRepository {
  buildCreateStatement(db: DbOrTx, codeHash: string, faceValueCents: number): any {
    return db.insert(buvetteCardsTable)
      .values({ kind: 'paper', paperCodeHash: codeHash, faceValueCents, paperStatus: 'new', balanceCents: 0, createdAt: new Date() })
      .returning({ id: buvetteCardsTable.id });
  }

  findByHash(db: DbOrTx, codeHash: string) {
    return db.select().from(buvetteCardsTable).where(eq(buvetteCardsTable.paperCodeHash, codeHash)).get();
  }

  /**
   * Retire le montant lu au lieu de filtrer : un `UPDATE … WHERE` qui ne trouve rien laisserait le
   * reste du lot créditer le compte. Si la carte a été remboursée, dépensée ou réservée entre-temps,
   * les CHECK du solde et de la réservation annulent tout le lot.
   */
  buildCloseStatement(db: DbOrTx, cardId: number, amountCents: number): any {
    return db.update(buvetteCardsTable)
      .set({ balanceCents: sql`${buvetteCardsTable.balanceCents} - ${amountCents}`, paperStatus: 'closed', paperClosedReason: 'merged' })
      .where(eq(buvetteCardsTable.id, cardId));
  }

  buildCreditStatement(db: DbOrTx, cardId: number, amountCents: number): any {
    return db.update(buvetteCardsTable)
      .set({ balanceCents: sql`${buvetteCardsTable.balanceCents} + ${amountCents}` })
      .where(eq(buvetteCardsTable.id, cardId));
  }

  /** La clé unique du mouvement fait échouer un second transfert : la carte ne se transfère qu'une fois. */
  buildMovementStatement(db: DbOrTx, clientId: string, cardId: number, amountCents: number): any {
    return db.insert(buvetteCardMovementsTable).values({
      clientId,
      cardId,
      sessionId: null,
      saleId: null,
      type: 'transfer',
      amountCents,
      createdByEmail: 'client',
      createdAt: new Date()
    });
  }
}
