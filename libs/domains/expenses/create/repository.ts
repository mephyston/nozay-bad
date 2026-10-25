import { getSeasonId } from '@nba/accounting-api';
import { asc, eq, sql } from 'drizzle-orm';
import { type Db, type DbOrTx } from '@nba/db';
import { expenseAttachmentsTable, expensesTable } from '../shared/schema';
import type { PieceAEcrire } from '../shared/pieces';
import type { CreateExpenseOutput } from './dto';

export class CreateExpenseRepository {
  /** `undefined` si le code de saison est inconnu : au handler de refuser. */
  async resolveSeasonId(db: DbOrTx, id: string | number): Promise<number | undefined> {
    return getSeasonId(db, id);
  }

  /**
   * La note et ses pièces, d'un seul lot : une note sans ses justificatifs ne doit pas
   * pouvoir exister, même le temps d'un échec.
   *
   * Les pièces visent la note par `MAX(id)` et non par `last_insert_rowid()`, qui
   * désignerait la pièce précédente dès la deuxième. Le lot est une transaction : aucune
   * autre note ne peut s'intercaler.
   */
  async create(
    db: Db,
    values: typeof expensesTable.$inferInsert,
    pieces: PieceAEcrire[]
  ): Promise<CreateExpenseOutput> {
    const note = db.insert(expensesTable).values(values).returning();
    const enfants = pieces.map((piece, position) =>
      db.insert(expenseAttachmentsTable).values({
        expenseId: sql`(SELECT MAX(id) FROM expenses)`,
        position,
        mediaType: piece.mediaType,
        dataUrl: piece.dataUrl,
        createdAt: values.createdAt
      })
    );
    // Double écriture le temps du retour arrière possible : l'ancien code ne lit que
    // `photo_url`, qui reçoit la première pièce (cf. migration 0045).
    const ancienne = db.update(expensesTable)
      .set({ photoUrl: sql`(SELECT data_url FROM expense_attachments WHERE expense_id = (SELECT MAX(id) FROM expenses) ORDER BY position LIMIT 1)` })
      .where(sql`${expensesTable.id} = (SELECT MAX(id) FROM expenses)`);
    const [lignes] = await db.batch([note, ...enfants, ancienne]);
    const expense = (lignes as (typeof expensesTable.$inferSelect)[])[0];

    const attachments = await db
      .select({ id: expenseAttachmentsTable.id, mediaType: expenseAttachmentsTable.mediaType })
      .from(expenseAttachmentsTable)
      .where(eq(expenseAttachmentsTable.expenseId, expense.id))
      .orderBy(asc(expenseAttachmentsTable.position))
      .all();
    return { ...expense, photoUrl: null, attachments };
  }
}
