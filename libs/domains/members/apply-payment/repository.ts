import { membershipsTable } from '@nba/members/schema';
import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';


/**
 * Un règlement s'impute à l'**adhésion** d'une saison, jamais à la personne : c'est la
 * cotisation d'une année qui se solde. L'identifiant reçu est donc celui de `memberships`,
 * inchangé depuis toujours.
 */
export class ApplyPaymentRepository {
  async getById(db: DbOrTx, id: number): Promise<typeof membershipsTable.$inferSelect | undefined> {
    return db.select().from(membershipsTable).where(eq(membershipsTable.id, id)).get();
  }

  buildUpdatePaymentStatement(db: DbOrTx, id: number, values: { amountReceivedCents: number; amountRemainingCents: number; paid: boolean }): any {
    return db.update(membershipsTable)
      .set(values)
      .where(eq(membershipsTable.id, id));
  }

  async updatePayment(db: DbOrTx, id: number, values: { amountReceivedCents: number; amountRemainingCents: number; paid: boolean }): Promise<void> {
    await db.update(membershipsTable)
      .set(values)
      .where(eq(membershipsTable.id, id))
      .run();
  }
}
