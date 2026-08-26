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

  /*
   * Un virement se supprime entier.
   *
   * Ses deux jambes ne sont pas deux écritures que le trésorier aurait saisies l'une après
   * l'autre : c'est un seul mouvement, écrit des deux côtés. N'en retirer qu'une laisserait un
   * demi-virement — de l'argent parti de nulle part, ou arrivé de nulle part — que rien dans le
   * modèle ne peut rattraper. La suppression porte donc sur le parent et sur les deux jambes,
   * quelle que soit celle par laquelle on est entré.
   */
  const entriesToDelete = tx.transferId
    ? await repo.getTransferLegs(db, tx.transferId)
    : [tx];

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
  /*
   * Chaque jambe peut pointer sa propre ligne de relevé : on les remet toutes en `pending`, sans
   * quoi une ligne resterait marquée rapprochée face à une écriture qui n'existe plus — et
   * bloquerait la clôture sans qu'on puisse en retrouver la cause.
   */
  for (const entry of entriesToDelete) {
    if (entry.id !== id && entry.bankStatementLineId) {
      statements.push(repo.buildUpdateBankStatementLineStatusStatement(db, entry.bankStatementLineId, 'pending'));
    }
    statements.push(repo.buildDeleteLedgerEntryStatement(db, entry.id));
  }

  // Le parent part en dernier : les jambes le référencent.
  if (tx.transferId) {
    statements.push(repo.buildDeleteTransferStatement(db, tx.transferId));
  }

  // Reset expense status if linked
  await repo.resetExpenseStatusByTxId(db, id);

  // Phase 3 : Écriture (db.batch)
  await db.batch(statements as any);
}
