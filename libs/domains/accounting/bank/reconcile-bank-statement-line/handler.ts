import { ReconcileBankStatementLineRepository } from './repository';
import { isSeasonClosed } from '@nba/members-api';
import { applyPaymentToMember } from '@nba/members-api';
import { AppError, type Db, type Tx } from '@nba/db';
import { normalizeCategory } from '../../shared/helpers';
import { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import { ReconcileBankTxInternalId, ReconcileBankTxInternalInput, ReconcileBankTxInternalOutput } from "./dto";
import { BankStatementLine } from '../../shared/bank-statement-line';
import { validateAccrualAndFiscalPhase } from '../../shared/accruals';

export async function reconcileBankTxInternal(db: Db, id: ReconcileBankTxInternalId, body: ReconcileBankTxInternalInput): Promise<ReconcileBankTxInternalOutput> {
  const repo = new ReconcileBankStatementLineRepository();
  const bankTxData = await repo.getBankStatementLineById(db, id);
  if (!bankTxData) {
    return { success: false, error: 'Écriture bancaire non trouvée.', status: 404 };
  }
  
  const bankTx = new BankStatementLine(bankTxData);
  if (!bankTx.canBeReconciled()) {
    return { success: false, error: 'Écriture bancaire déjà rapprochée.', status: 400 };
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
    const existingTx = await repo.getTransactionById(db, body.ledgerEntryId);
    if (!existingTx) {
      return { success: false, error: 'Transaction cible introuvable.', status: 404 };
    }
    if (await isSeasonClosed(db, existingTx.seasonId)) {
      return { success: false, error: 'La saison de la transaction est clôturée. Rapprochement impossible.', status: 400 };
    }

    await repo.linkTransactionToBank(db, body.ledgerEntryId, id, memberId);
    lastTxId = body.ledgerEntryId;
  } else if (body.action === 'create') {
    if (body.transactions && Array.isArray(body.transactions)) {
      for (const txItem of body.transactions) {
        await validateAccrualAndFiscalPhase(db, {
          seasonId: txItem.seasonId,
          type: txItem.type,
          date: txItem.date,
          accrualType: txItem.accrualType || txItem.accrual_type,
          accrualNote: txItem.accrualNote || txItem.accrual_note
        });

        await repo.createLedgerEntry(db, {
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
          accrualType: txItem.accrualType || txItem.accrual_type || 'normal',
          accrualNote: txItem.accrualNote || txItem.accrual_note || null,
          memberId: memberId || null,
          invoiceId: invoiceId || null,
          bankStatementLineId: id,
          createdAt: new Date()
        });
      }
    } else {
      const tx = body.transaction;
      if (!tx) {
        return { success: false, error: 'Détails de la transaction manquants.', status: 400 };
      }
      
      await validateAccrualAndFiscalPhase(db, {
        seasonId: tx.seasonId,
        type: tx.type,
        date: tx.date,
        accrualType: tx.accrualType || tx.accrual_type,
        accrualNote: tx.accrualNote || tx.accrual_note
      });

      const newTx = await repo.createLedgerEntry(db, {
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
        accrualType: tx.accrualType || tx.accrual_type || 'normal',
        accrualNote: tx.accrualNote || tx.accrual_note || null,
        memberId: memberId || null,
        invoiceId: (invoiceIds && invoiceIds.length > 0) ? invoiceIds[0] : (invoiceId || null),
        bankStatementLineId: id,
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

  const linkedTxs = await repo.getLedgerEntriesForBankStatementLine(db, id);
  const totalLinked = linkedTxs.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

  if (totalLinked >= Math.abs(bankTx.amount)) {
    await repo.markBankStatementLineReconciled(db, id);
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
        const membershipTxs = body.transactions.filter((t) => isMembershipCategory(t.category));
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
      const matchedTx = await repo.getTransactionById(db, body.ledgerEntryId);
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

export async function reconcileBankStatementLine(db: Db, id: number, body: any) {
  const runReconciliation = async (txDb: Tx) => {
    const result = await reconcileBankTxInternal(txDb, id, body);
    if (!result.success) {
      throw new AppError(result.error || 'Reconciliation failed', result.status || 400);
    }
  };

  if (db instanceof SQLiteTransaction) {
    await runReconciliation(db);
  } else {
    await db.transaction(async (txDb: Tx) => {
      await runReconciliation(txDb);
    });
  }
}

export async function reconcileBulkTransactions(db: Db, requests: any[]) {
  const runBulk = async (txDb: Tx) => {
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

  if (db instanceof SQLiteTransaction) {
    return await runBulk(db);
  } else {
    return await db.transaction(async (txDb: Tx) => {
      return await runBulk(txDb);
    });
  }
}
