import { ReconcileBankTransactionRepository } from './repository';
import { isSeasonClosed } from '@metacult/features-members-data-access';
import { applyPaymentToMember } from '@metacult/features-members-api';
import { AppError } from '@metacult/shared-db';
import { normalizeCategory } from '@metacult/features-accounting-data-access';

export async function reconcileBankTxInternal(db: any, id: number, body: any): Promise<{ success: boolean, error?: string, status?: number }> {
  const repo = new ReconcileBankTransactionRepository();
  const bankTx = await repo.getBankTransactionById(db, id);
  if (!bankTx) {
    return { success: false, error: 'Écriture bancaire non trouvée.', status: 404 };
  }

  if (await isSeasonClosed(db, bankTx.seasonId)) {
    return { success: false, error: 'La saison de l\'écriture bancaire est clôturée.', status: 400 };
  }

  const memberId = body.memberId || body.transaction?.memberId;
  const invoiceId = body.invoiceId;
  const invoiceIds = body.invoiceIds;

  if (invoiceId) {
    const invoice = await repo.getInvoiceById(db, invoiceId);
    if (!invoice) {
      return { success: false, error: 'Facture introuvable', status: 404 };
    }
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      return { success: false, error: 'La facture a déjà été payée ou a été annulée.', status: 400 };
    }
    if (await isSeasonClosed(db, invoice.seasonId)) {
      return { success: false, error: 'La saison de la facture est clôturée.', status: 400 };
    }
  }

  if (invoiceIds && Array.isArray(invoiceIds)) {
    for (const invId of invoiceIds) {
      const invoice = await repo.getInvoiceById(db, invId);
      if (!invoice) {
        return { success: false, error: 'Facture introuvable', status: 404 };
      }
      if (invoice.status === 'paid' || invoice.status === 'cancelled') {
        return { success: false, error: 'La facture a déjà été payée ou a été annulée.', status: 400 };
      }
      if (await isSeasonClosed(db, invoice.seasonId)) {
        return { success: false, error: 'La saison de la facture est clôturée.', status: 400 };
      }
    }
  }

  let lastTxId = null;

  if (body.action === 'match') {
    const existingTx = await repo.getTransactionById(db, body.transactionId);
    if (!existingTx) {
      return { success: false, error: 'Transaction cible introuvable.', status: 404 };
    }
    if (await isSeasonClosed(db, existingTx.seasonId)) {
      return { success: false, error: 'La saison de la transaction est clôturée. Rapprochement impossible.', status: 400 };
    }

    await repo.linkTransactionToBank(db, body.transactionId, id, memberId);
    lastTxId = body.transactionId;
  } else if (body.action === 'create') {
    if (body.transactions && Array.isArray(body.transactions)) {
      for (const txItem of body.transactions) {
        if (await isSeasonClosed(db, txItem.seasonId)) {
          return { success: false, error: 'La saison cible est clôturée. Rapprochement impossible.', status: 400 };
        }
        await repo.createTransaction(db, {
          seasonId: txItem.seasonId,
          type: txItem.type,
          accountId: txItem.accountId,
          destinationAccountId: txItem.destinationAccountId || null,
          category: normalizeCategory(txItem.category),
          amount: Math.round(txItem.amount),
          date: txItem.date,
          paymentMethod: txItem.paymentMethod,
          description: txItem.description,
          reference: txItem.reference || null,
          memberId: memberId || null,
          invoiceId: invoiceId || null,
          bankTransactionId: id,
          createdAt: new Date()
        });
      }
    } else {
      const tx = body.transaction;
      if (!tx) {
        return { success: false, error: 'Détails de la transaction manquants.', status: 400 };
      }
      if (await isSeasonClosed(db, tx.seasonId)) {
        return { success: false, error: 'La saison cible est clôturée. Rapprochement impossible.', status: 400 };
      }

      const newTx = await repo.createTransaction(db, {
        seasonId: tx.seasonId,
        type: tx.type,
        accountId: tx.accountId,
        destinationAccountId: tx.destinationAccountId || null,
        category: normalizeCategory(tx.category),
        amount: Math.round(tx.amount),
        date: tx.date,
        paymentMethod: tx.paymentMethod,
        description: tx.description,
        reference: tx.reference || null,
        memberId: memberId || null,
        invoiceId: (invoiceIds && invoiceIds.length > 0) ? invoiceIds[0] : (invoiceId || null),
        bankTransactionId: id,
        createdAt: new Date()
      });

      lastTxId = newTx.id;
    }

    if (invoiceId) {
      await repo.markInvoiceAsPaid(db, invoiceId, id);
    }

    if (invoiceIds && Array.isArray(invoiceIds)) {
      for (const invId of invoiceIds) {
        await repo.markInvoiceAsPaid(db, invId, id);
      }
    }
  } else {
    return { success: false, error: 'Action invalide.', status: 400 };
  }

  const linkedTxs = await repo.getTransactionsForBankTransaction(db, id);
  const totalLinked = linkedTxs.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

  if (totalLinked >= Math.abs(bankTx.amount)) {
    await repo.markBankTransactionReconciled(db, id);
  }

  if (memberId) {
    const isMembershipCategory = (cat: any) => {
      const norm = normalizeCategory(cat);
      return norm === 1 || cat === 'adhesions_inscriptions' || String(cat) === '1';
    };

    let amountToApply = 0;
    let hasMembershipTx = false;

    if (body.action === 'create') {
      if (body.transactions && Array.isArray(body.transactions)) {
        const membershipTxs = body.transactions.filter((t: any) => isMembershipCategory(t.category));
        if (membershipTxs.length > 0) {
          hasMembershipTx = true;
          amountToApply = membershipTxs.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
        }
      } else {
        const categoryStr = body.transaction?.category;
        if (isMembershipCategory(categoryStr)) {
          hasMembershipTx = true;
          amountToApply = Math.abs(body.transaction?.amount ?? bankTx.amount);
        }
      }
    } else if (body.action === 'match') {
      const matchedTx = await repo.getTransactionById(db, body.transactionId);
      const categoryStr = matchedTx ? matchedTx.category : null;
      if (isMembershipCategory(categoryStr)) {
        hasMembershipTx = true;
        amountToApply = Math.abs(bankTx.amount);
      }
    }

    if (hasMembershipTx) {
      await applyPaymentToMember(db, memberId, amountToApply);
    }
  }

  return { success: true };
}

export async function reconcileBankTransaction(db: any, id: number, body: any) {
  const runReconciliation = async (txDb: any) => {
    const result = await reconcileBankTxInternal(txDb, id, body);
    if (!result.success) {
      throw new AppError(result.error || 'Reconciliation failed', result.status || 400);
    }
  };

  try {
    await db.transaction(async (txDb: any) => {
      await runReconciliation(txDb);
    });
  } catch (err: any) {
    if (err.message && err.message.includes('begin')) {
      await runReconciliation(db);
    } else {
      throw err;
    }
  }
}

export async function reconcileBulkTransactions(db: any, requests: any[]) {
  const runBulk = async (txDb: any) => {
    let count = 0;
    for (const req of requests) {
      const result = await reconcileBankTxInternal(txDb, req.btId, req);
      if (!result.success) {
        throw new AppError(result.error || 'Matching operation failed', result.status || 400);
      }
      count++;
    }
    return count;
  };

  try {
    return await db.transaction(async (txDb: any) => {
      return await runBulk(txDb);
    });
  } catch (err: any) {
    if (err.message && err.message.includes('begin')) {
      return await runBulk(db);
    } else {
      throw err;
    }
  }
}
