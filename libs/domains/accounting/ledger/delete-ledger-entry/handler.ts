import { DeleteTransactionRepository } from './repository';
import { isSeasonClosed, getMemberById, buildApplyPaymentStatement } from '@nba/members-api';
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
      const totalRemaining = remainingTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);

      if (totalRemaining < Math.abs(bankTx.amount)) {
        resetBankTxNeeded = true;
      }
    }
  }

  let memberData: any = null;
  if (tx.memberId && (tx.category === 1 || String(tx.category) === '1')) {
    memberData = await getMemberById(db, tx.memberId);
  }

  // Phase 2 : Décision (en mémoire)
  const statements: any[] = [];

  if (tx.bankStatementLineId && resetBankTxNeeded) {
    statements.push(repo.buildUpdateBankStatementLineStatusStatement(db, tx.bankStatementLineId, 'pending'));
  }

  if (memberData) {
    statements.push(buildApplyPaymentStatement(db, memberData, -Math.abs(tx.amount)));
  }

  statements.push(repo.buildDeleteLedgerEntryStatement(db, id));

  // Reset expense status if linked
  await repo.resetExpenseStatusByTxId(db, id);

  // Phase 3 : Écriture (db.batch)
  await db.batch(statements as any);
}
