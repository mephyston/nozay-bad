import { getSeasonId } from '@nba/accounting-api';
import { asc, eq, inArray, sql } from 'drizzle-orm';
import { type Db, type DbOrTx } from '@nba/db';
import { expenseAttachmentsTable, expensesTable } from '../shared/schema';
import type { PlanDePieces } from './pieces';

export class UpdateExpenseRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    const sId = await getSeasonId(db, seasonIdOrCode);
    return sId !== undefined ? sId : 1;
  }

  async getById(db: DbOrTx, id: number): Promise<typeof expensesTable.$inferSelect | undefined> {
    return db.select().from(expensesTable).where(eq(expensesTable.id, id)).get();
  }

  async update(db: DbOrTx, id: number, values: Partial<typeof expensesTable.$inferInsert>): Promise<typeof expensesTable.$inferSelect | undefined> {
    return db.update(expensesTable).set(values).where(eq(expensesTable.id, id)).returning().get();
  }

  /** Les identifiants des pièces de la note, dans leur ordre. */
  async attachmentIds(db: DbOrTx, expenseId: number): Promise<number[]> {
    const lignes = await db
      .select({ id: expenseAttachmentsTable.id })
      .from(expenseAttachmentsTable)
      .where(eq(expenseAttachmentsTable.expenseId, expenseId))
      .orderBy(asc(expenseAttachmentsTable.position))
      .all();
    return lignes.map((l) => l.id);
  }

  /**
   * La note et ses pièces d'un seul lot : un justificatif retiré sans que la note soit
   * enregistrée, ou l'inverse, laisserait une note qui ne dit plus ce qu'on a validé.
   * Cinq pièces au plus : le lot reste court.
   */
  async updateWithAttachments(
    db: Db,
    id: number,
    values: Partial<typeof expensesTable.$inferInsert>,
    plan: PlanDePieces
  ): Promise<void> {
    const champs = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined));
    const ecritures: any[] = [];
    if (Object.keys(champs).length > 0) {
      ecritures.push(db.update(expensesTable).set(champs).where(eq(expensesTable.id, id)));
    }
    if (plan.retirees.length > 0) {
      ecritures.push(db.delete(expenseAttachmentsTable).where(inArray(expenseAttachmentsTable.id, plan.retirees)));
    }
    for (const { id: pieceId, position } of plan.gardees) {
      ecritures.push(db.update(expenseAttachmentsTable).set({ position }).where(eq(expenseAttachmentsTable.id, pieceId)));
    }
    for (const piece of plan.ajoutees) {
      ecritures.push(db.insert(expenseAttachmentsTable).values({
        expenseId: id,
        position: piece.position,
        mediaType: piece.mediaType,
        dataUrl: piece.dataUrl,
        createdAt: new Date()
      }));
    }
    // Double écriture le temps du retour arrière possible : `photo_url` suit la première pièce.
    ecritures.push(db.update(expensesTable)
      .set({ photoUrl: sql`(SELECT data_url FROM expense_attachments WHERE expense_id = ${id} ORDER BY position LIMIT 1)` })
      .where(eq(expensesTable.id, id)));
    await db.batch(ecritures as [any, ...any[]]);
  }

  buildApproveExpenseStatement(db: DbOrTx, id: number): any {
    return db.update(expensesTable)
      .set({
        status: 'approved',
        ledgerEntryId: sql`(SELECT last_insert_rowid())`
      })
      .where(eq(expensesTable.id, id));
  }

  buildCancelApprovalExpenseStatement(db: DbOrTx, id: number): any {
    return db.update(expensesTable)
      .set({ status: 'pending', ledgerEntryId: null })
      .where(eq(expensesTable.id, id));
  }

  async approve(db: DbOrTx, id: number, ledgerEntryId: number): Promise<typeof expensesTable.$inferSelect> {
    return db.update(expensesTable)
      .set({ status: 'approved', ledgerEntryId })
      .where(eq(expensesTable.id, id))
      .returning().get();
  }

  async reject(db: DbOrTx, id: number): Promise<typeof expensesTable.$inferSelect> {
    return db.update(expensesTable)
      .set({ status: 'rejected' })
      .where(eq(expensesTable.id, id))
      .returning().get();
  }

  async cancelApproval(db: DbOrTx, id: number): Promise<typeof expensesTable.$inferSelect> {
    return db.update(expensesTable)
      .set({ status: 'pending', ledgerEntryId: null })
      .where(eq(expensesTable.id, id))
      .returning().get();
  }
}
