import { ReconcileBankStatementLineRepository } from './repository';
import { isSeasonClosed } from '@nba/members-api';
import { AppError, type Db } from '@nba/db';
import { normalizeCategory } from '../../shared/helpers';
import { ReconcileBankTxInternalId, ReconcileBankTxInternalInput, ReconcileBankTxInternalOutput } from "./dto";
import { BankStatementLine } from '../../shared/bank-statement-line';
import { validateAccrualAndFiscalPhase } from '../../shared/accruals';
import { resolveAccountId, resolvePaymentMethod } from '../../config/queries';

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

  /*
   * L'adhérent et la facture se portent par **part**, et non plus une fois pour toutes.
   *
   * `memberId` vivait hors de la boucle de ventilation : les N écritures d'un virement groupé
   * recevaient toutes le même adhérent, ce qui rendait deux cotisations réglées d'un seul
   * virement impossibles à ventiler correctement. Idem pour la facture, dont seul le premier
   * identifiant était retenu — les autres passaient `paid` sans écriture pour les porter.
   *
   * Les valeurs au niveau du corps restent lues, en repli : elles servent l'écriture unique et
   * les appelants qui ne ventilent pas.
   */
  const memberId = body.memberId || body.transaction?.memberId;
  const parts: any[] = Array.isArray(body.transactions) ? body.transactions : [];

  const invoiceIdsToSettle = Array.from(new Set([
    ...(body.invoiceId ? [body.invoiceId] : []),
    ...(Array.isArray(body.invoiceIds) ? body.invoiceIds : []),
    ...parts.map((part) => part.invoiceId).filter(Boolean)
  ])) as number[];

  for (const invId of invoiceIdsToSettle) {
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

  /*
   * Le rapprochement ne fabrique pas de virement interne.
   *
   * Le validator acceptait `type: 'transfert'` **et** une catégorie à la fois, et le bâtisseur
   * n'annulait ni l'un ni l'autre : un appel direct produisait une écriture qui violait le CHECK,
   * donc une erreur D1 brute en 500 au lieu d'un message. Un virement s'écrit maintenant en deux
   * jambes, ce que cette route ne sait pas faire — autant le dire.
   */
  const proposedTypes = [
    body.transaction?.type,
    ...((body.transactions ?? []).map((t: any) => t.type))
  ].filter(Boolean);
  if (proposedTypes.includes('transfert')) {
    return {
      statements: [],
      error: 'Un virement interne se saisit via POST /accounting/internal-transfers, puis se pointe par « Associer ».',
      status: 400
    };
  }

  const statements: any[] = [];
  /* Le montant de l'écriture pointée, retenu pour décider si la ligne est soldée. */
  let matchedAmountCents = 0;

  if (body.action === 'match') {
    const existingTx = await repo.getTransactionById(db, body.ledgerEntryId);
    if (!existingTx) {
      return { statements: [], error: 'Transaction cible introuvable.', status: 404 };
    }
    if (await isSeasonClosed(db, existingTx.seasonId)) {
      return { statements: [], error: 'La saison de la transaction est clôturée. Rapprochement impossible.', status: 400 };
    }

    matchedAmountCents = Math.abs(existingTx.amountCents ?? existingTx.amount ?? 0);
    statements.push(repo.buildLinkTransactionToBankStatement(db, body.ledgerEntryId, id, memberId));
  } else if (body.action === 'create') {
    if (body.transactions && Array.isArray(body.transactions)) {
      for (const txItem of body.transactions) {
        const rawSeason = txItem.seasonId || (await repo.getSeasonIdByDate(db, txItem.date || bankTx.date));
        if (!rawSeason) {
          return { statements: [], error: "Impossible de déterminer l'exercice comptable pour la date indiquée.", status: 400 };
        }
        await validateAccrualAndFiscalPhase(db, {
          seasonId: rawSeason,
          type: txItem.type,
          date: txItem.date,
          accrualType: txItem.accrualType || txItem.accrual_type,
          accrualNote: txItem.accrualNote || txItem.accrual_note
        });

        const seasonId = await repo.resolveSeasonId(db, rawSeason);

        statements.push(repo.buildCreateLedgerEntryStatement(db, {
          seasonId,
          type: txItem.type,
          accountId: await resolveAccountId(db, txItem.accountId),
          category: normalizeCategory(txItem.category),
          amount: Math.round(txItem.amount),
          date: txItem.date,
          paymentMethod: (await resolvePaymentMethod(db, txItem.paymentMethod)).id,
          description: txItem.description,
          reference: txItem.reference || null,
          accrualType: txItem.accrualType || txItem.accrual_type || 'normal',
          accrualNote: txItem.accrualNote || txItem.accrual_note || null,
          // La part l'emporte sur la valeur commune : c'est ce qui rend la ventilation exacte.
          memberId: txItem.memberId ?? memberId ?? null,
          invoiceId: txItem.invoiceId ?? null,
          bankStatementLineId: id,
          createdAt: new Date()
        }));
      }
    } else {
      const tx = body.transaction;
      if (!tx) {
        return { statements: [], error: 'Détails de la transaction manquants.', status: 400 };
      }

      const rawSeason = tx.seasonId || (await repo.getSeasonIdByDate(db, tx.date || bankTx.date));
      if (!rawSeason) {
        return { statements: [], error: "Impossible de déterminer l'exercice comptable pour la date indiquée.", status: 400 };
      }
      await validateAccrualAndFiscalPhase(db, {
        seasonId: rawSeason,
        type: tx.type,
        date: tx.date,
        accrualType: tx.accrualType || tx.accrual_type,
        accrualNote: tx.accrualNote || tx.accrual_note
      });

      const seasonId = await repo.resolveSeasonId(db, rawSeason);

      statements.push(repo.buildCreateLedgerEntryStatement(db, {
        seasonId,
        type: tx.type,
        accountId: await resolveAccountId(db, tx.accountId),
        category: normalizeCategory(tx.category),
        amount: Math.round(tx.amount),
        date: tx.date,
        paymentMethod: (await resolvePaymentMethod(db, tx.paymentMethod)).id,
        description: tx.description,
        reference: tx.reference || null,
        accrualType: tx.accrualType || tx.accrual_type || 'normal',
        accrualNote: tx.accrualNote || tx.accrual_note || null,
        memberId: tx.memberId ?? memberId ?? null,
        invoiceId: body.invoiceId ?? null,
        bankStatementLineId: id,
        createdAt: new Date()
      }));
    }

    for (const invId of invoiceIdsToSettle) {
      statements.push(repo.buildMarkInvoiceAsPaidStatement(db, invId, id));
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
    /*
     * Le montant de l'écriture pointée, et non celui de la ligne bancaire.
     *
     * En prenant le second, la somme comparée valait toujours au moins le montant de la ligne :
     * le tout premier pointage la marquait rapprochée, quel qu'ait été le montant de l'écriture.
     * Une ligne de 150 € pointée contre une écriture de 50 € se refermait sur 100 € manquants —
     * et l'écran n'offrait donc jamais d'en pointer une seconde, alors que le modèle sait
     * parfaitement rattacher plusieurs écritures à une même ligne.
     */
    newTxAmount = matchedAmountCents;
  }

  if (existingLinkedTotal + newTxAmount >= Math.abs(bankTx.amount)) {
    statements.push(repo.buildMarkBankStatementLineReconciledStatement(db, id));
  }

  /*
   * Le règlement de l'adhérent n'est **pas** mis à jour ici.
   *
   * `memberships.amount_received_cents` vient de l'export Poona, et de lui seul. Ce bloc y
   * ajoutait le montant rapproché, alors que l'import l'écrase : un même règlement, présent
   * des deux côtés, comptait deux fois — et le résultat dépendait de l'ordre des deux
   * opérations, donc changeait tout seul au prochain import. Il additionnait par ailleurs un
   * `Math.abs()` sans regarder le `type`, si bien qu'un remboursement d'adhésion gonflait le
   * montant reçu au lieu de le réduire.
   *
   * Le rattachement, lui, reste : `ledger_entries.member_id` dit à quelle adhésion l'argent
   * se rapporte, et c'est le rôle du rapprochement. Cf. `members/shared/schema.ts`.
   */

  return { statements };
}

export async function reconcileBankTxInternal(db: Db, id: ReconcileBankTxInternalId, body: ReconcileBankTxInternalInput): Promise<ReconcileBankTxInternalOutput> {
  const result = await buildReconciliationStatements(db, id, body);
  if (result.error) {
    return { success: false, error: result.error, status: result.status };
  }

  await db.batch(result.statements as any);

  /*
   * On relit ce qu'on vient d'écrire, plutôt que de le déduire de la demande.
   *
   * Deux lectures contre un rechargement complet de la page : l'écran n'avait aucun autre moyen
   * de connaître le nouveau statut de la ligne ni l'identifiant des écritures créées. Les
   * reconstituer côté client à partir du corps envoyé aurait marché tant que le serveur ne
   * normalise rien — or il résout le compte, le mode de règlement et la catégorie, et fait
   * basculer la ligne en `reconciled` sur un cumul que le client ne calcule pas.
   */
  const repo = new ReconcileBankStatementLineRepository();
  const [line, entries] = await Promise.all([
    repo.getBankStatementLineById(db, id),
    repo.getLinkedLedgerEntriesForUi(db, id)
  ]);

  return { success: true, line, entries };
}

export async function reconcileBankStatementLine(db: Db, id: number, body: any) {
  const result = await reconcileBankTxInternal(db, id, body);
  if (!result.success) {
    throw new AppError(result.error || 'Reconciliation failed', result.status || 400);
  }
  return { line: result.line, entries: result.entries };
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

  // Le même compte rendu que le rapprochement unitaire, pour chacune des lignes traitées.
  const repo = new ReconcileBankStatementLineRepository();
  const ids = Array.from(new Set(requests.map((req) => req.btId as number)));
  const results = await Promise.all(ids.map(async (id) => {
    const [line, entries] = await Promise.all([
      repo.getBankStatementLineById(db, id),
      repo.getLinkedLedgerEntriesForUi(db, id)
    ]);
    return { line, entries };
  }));

  return {
    count: requests.length,
    lines: results.map((r) => r.line).filter(Boolean),
    entries: results.flatMap((r) => r.entries)
  };
}
