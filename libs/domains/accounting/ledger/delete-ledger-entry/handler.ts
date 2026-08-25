import { DeleteTransactionRepository } from './repository';
import { isSeasonClosed } from '@nba/members-api';
import { AppError, type Db } from '@nba/db';
import { SeasonClosedError } from '../../shared/errors';

export async function deleteLedgerEntry(db: Db, id: number) {
  const repo = new DeleteTransactionRepository();

  // Phase 1 : Lecture (hors batch)
  const tx = await repo.getById(db, id);
  if (!tx) {
    throw new AppError('Transaction non trouvée', 404);
  }

  if (await isSeasonClosed(db, tx.seasonId)) {
    throw new SeasonClosedError('La saison est clôturée. Impossible de supprimer cette transaction.');
  }

  let resetBankTxNeeded = false;
  if (tx.bankStatementLineId) {
    const bankTx = await repo.getBankStatementLineById(db, tx.bankStatementLineId);
    if (bankTx) {
      const remainingTxs = await repo.getRemainingTransactionsForBankTx(db, tx.bankStatementLineId, id);
      const totalRemaining = remainingTxs.reduce((sum, t) => sum + Math.abs(t.amountCents ?? 0), 0);
      const bankTxAmt = Math.abs(bankTx.amountCents ?? 0);

      if (totalRemaining < bankTxAmt) {
        resetBankTxNeeded = true;
      }
    }
  }

  // Phase 2 : Décision (en mémoire)
  const statements: any[] = [];

  if (tx.bankStatementLineId && resetBankTxNeeded) {
    statements.push(repo.buildUpdateBankStatementLineStatusStatement(db, tx.bankStatementLineId, 'pending'));
  }

  /*
   * Le règlement de l'adhérent n'est pas retouché : `memberships` vient de l'export Poona,
   * qui écrase de toute façon ce que la comptabilité y aurait écrit. Retirer le montant ici
   * n'annulait rien de fiable — cela creusait un second écart en sens inverse.
   */
  statements.push(repo.buildDeleteLedgerEntryStatement(db, id));

  // Reset expense status if linked
  await repo.resetExpenseStatusByTxId(db, id);

  // Phase 3 : Écriture (db.batch)
  await db.batch(statements as any);
}
