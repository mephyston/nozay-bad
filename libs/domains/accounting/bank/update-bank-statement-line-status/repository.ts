import { type DbOrTx } from '@nba/db';
import { eq, inArray } from 'drizzle-orm';
import { bankStatementLinesTable } from '../../shared/schema';

export class UpdateBankStatementLineStatusRepository {
  async updateStatus(db: DbOrTx, id: number, status: 'pending' | 'ignored'): Promise<void> {
    await db.update(bankStatementLinesTable)
      .set({ status })
      .where(eq(bankStatementLinesTable.id, id))
      .run();
  }

  /**
   * Le même changement pour plusieurs lignes, en une requête.
   *
   * L'écran émettait un POST par ligne en `Promise.all` : masquer deux cents frais bancaires
   * ouvrait deux cents requêtes parallèles vers la page, chacune rouvrant un appel à l'API.
   */
  async updateStatuses(db: DbOrTx, ids: number[], status: 'pending' | 'ignored'): Promise<void> {
    if (ids.length === 0) return;
    await db.update(bankStatementLinesTable)
      .set({ status })
      .where(inArray(bankStatementLinesTable.id, ids))
      .run();
  }
}
