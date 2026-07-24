import { ReconcileBankStatementLineRepository } from './repository';
import { isSeasonClosed, getMemberById, buildApplyPaymentStatement } from '@nba/members-api';
import { AppError, type Db } from '@nba/db';
import { normalizeCategory } from '../../shared/helpers';
import { ReconcileBankTxInternalId, ReconcileBankTxInternalInput, ReconcileBankTxInternalOutput } from "./dto";
import { BankStatementLine } from '../../shared/bank-statement-line';
import { validateAccrualAndFiscalPhase } from '../../shared/accruals';

export async function buildReconciliationStatements(db: Db, id: ReconcileBankTxInternalId, body: ReconcileBankTxInternalInput): Promise<{ statements: any[]; error?: string; status?: number }> {
  const repo = new ReconcileBankStatementLineRepository();
  const bankTxData = await repo.getBankStatementLineById(db, id);
  if (!bankTxData) {
    return { statements: [], error: 'Écriture bancaire non trouvée.', status: 404 };
  }

  const bankTx = new BankStatementLine(bankTxData);
  if (!bankTx.canBeReconciled()) {
    return { statements: [], error: 'Écriture bancaire déjà rapprochée.', status: 400 };
  }

  if (await isSeasonClosed(db, bankTx.seasonId)) {
    return { statements: [], error: 'La saison de l\'écriture bancaire est clôturée.', status: 400 };
  }

  const memberId = body.memberId || body.transaction?.memberId;
  const invoiceId = body.invoiceId;
  const invoiceIds = body.invoiceIds;

  if (invoiceId) {
    const invoice = await repo.getInvoiceById(db, invoiceId);
    if (!invoice) {
      return { statements: [], error: 'Facture introuvable', status: 404 };
    }
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      return { statements: [], error: 'La facture a déjà été payée ou a été annulée.', status: 400 };
    }
    if (await isSeasonClosed(db, invoice.seasonId)) {
      return { statements: [], error: 'La saison de la facture est clôturée.', status: 400 };
    }
  }

  if (invoiceIds && Array.isArray(invoiceIds)) {
    for (const invId of invoiceIds) {
      const invoice = await repo.getInvoiceById(db, invId);
      if (!invoice) {
        return { statements: [], error: 'Facture introuvable', status: 404 };
      }
      if (invoice.status === 'paid' || invoice.status === 'cancelled') {
        return { statements: [], error: 'La facture a déjà été payée ou a été annulée.', status: 400 };
      }
      if (await isSeasonClosed(db, invoice.seasonId)) {
        return { statements: [], error: 'La saison de la facture est clôturée.', status: 400 };
      }
    }
  }

  const statements: any[] = [];

  if (body.action === 'match') {
    const existingTx = await repo.getTransactionById(db, body.ledgerEntryId);
    if (!existingTx) {
      return { statements: [], error: 'Transaction cible introuvable.', status: 404 };
    }
    if (await isSeasonClosed(db, existingTx.seasonId)) {
      return { statements: [], error: 'La saison de la transaction est clôturée. Rapprochement impossible.', status: 400 };
    }

    statements.push(repo.buildLinkTransactionToBankStatement(db, body.ledgerEntryId, id, memberId));
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

        statements.push(repo.buildCreateLedgerEntryStatement(db, {
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
        }));
      }
    } else {
      const tx = body.transaction;
      if (!tx) {
        return { statements: [], error: 'Détails de la transaction manquants.', status: 400 };
      }

      await validateAccrualAndFiscalPhase(db, {
        seasonId: tx.seasonId,
        type: tx.type,
        date: tx.date,
        accrualType: tx.accrualType || tx.accrual_type,
        accrualNote: tx.accrualNote || tx.accrual_note
      });

      statements.push(repo.buildCreateLedgerEntryStatement(db, {
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
      }));
    }

    if (invoiceId) {
      statements.push(repo.buildMarkInvoiceAsPaidStatement(db, invoiceId, id));
    }

    if (invoiceIds && Array.isArray(invoiceIds)) {
      for (const invId of invoiceIds) {
        statements.push(repo.buildMarkInvoiceAsPaidStatement(db, invId, id));
      }
    }
  } else {
    return { statements: [], error: 'Action invalide.', status: 400 };
  }

  const linkedTxs = await repo.getLedgerEntriesForBankStatementLine(db, id);
  const existingLinkedTotal = linkedTxs.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
  let newTxAmount = 0;
  if (body.action === 'create') {
    if (body.transactions && Array.isArray(body.transactions)) {
      newTxAmount = body.transactions.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
    } else if (body.transaction) {
      newTxAmount = Math.abs(body.transaction.amount);
    }
  } else if (body.action === 'match') {
    newTxAmount = Math.abs(bankTx.amount);
  }

  if (existingLinkedTotal + newTxAmount >= Math.abs(bankTx.amount)) {
    statements.push(repo.buildMarkBankStatementLineReconciledStatement(db, id));
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
      const memberData = await getMemberById(db, memberId);
      if (memberData) {
        statements.push(buildApplyPaymentStatement(db, memberData, amountToApply));
      }
    }
  }

  return { statements };
}

export async function reconcileBankTxInternal(db: Db, id: ReconcileBankTxInternalId, body: ReconcileBankTxInternalInput): Promise<ReconcileBankTxInternalOutput> {
  const result = await buildReconciliationStatements(db, id, body);
  if (result.error) {
    return { success: false, error: result.error, status: result.status };
  }

  await db.batch(result.statements as any);
  return { success: true };
}

export async function reconcileBankStatementLine(db: Db, id: number, body: any) {
  const result = await reconcileBankTxInternal(db, id, body);
  if (!result.success) {
    throw new AppError(result.error || 'Reconciliation failed', result.status || 400);
  }
}

export async function reconcileBulkTransactions(db: Db, requests: any[]) {
  const allStatements: any[] = [];
  for (const req of requests) {
    const res = await buildReconciliationStatements(db, req.btId, req);
    if (res.error) {
      throw new AppError(res.error || 'Matching operation failed', res.status || 400);
    }
    allStatements.push(...res.statements);
  }

  await db.batch(allStatements as any);
  return requests.length;
}
