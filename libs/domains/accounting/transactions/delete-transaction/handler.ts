import { DeleteTransactionRepository } from './repository';
import { isSeasonClosed } from '@nba/members-api';
import { AppError, type Db, type Tx } from '@nba/db';
import { SeasonClosedError } from '../../shared/errors';
import { applyPaymentToMember } from '@nba/members-api';

export async function deleteTransaction(db: Db, id: number) {
  const repo = new DeleteTransactionRepository();

  return db.transaction(async (txDb: Tx) => {
    const tx = await repo.getById(txDb, id);
    if (!tx) {
      throw new AppError('Transaction non trouvée', 404);
    }

    if (await isSeasonClosed(txDb, tx.seasonId)) {
      throw new SeasonClosedError('La saison est clôturée. Impossible de supprimer cette transaction.');
    }

    // 2. Si liée à un relevé bancaire, recalculer le pointage restant
    if (tx.bankTransactionId) {
      const bankTx = await repo.getBankTransactionById(txDb, tx.bankTransactionId);
      if (bankTx) {
        const remainingTxs = await repo.getRemainingTransactionsForBankTx(txDb, tx.bankTransactionId, id);
        const totalRemaining = remainingTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);

        if (totalRemaining < Math.abs(bankTx.amount)) {
          await repo.updateBankTransactionStatus(txDb, tx.bankTransactionId, 'pending');
        }
      }
    }

    // 3. Si liée à un adhérent pour une adhésion, déduire le montant reçu
    if (tx.memberId && (tx.category === 1 || String(tx.category) === '1')) {
      await applyPaymentToMember(txDb, tx.memberId, -Math.abs(tx.amount));
    }

    // 3.5. Si liée à une note de frais, la repasser en 'pending'
    await repo.resetExpenseStatusByTxId(txDb, id);

    // 4. Supprimer la transaction du Grand Livre
    await repo.delete(txDb, id);
  });
}
