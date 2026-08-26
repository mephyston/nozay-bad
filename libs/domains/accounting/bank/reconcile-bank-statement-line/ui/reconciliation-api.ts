import type { BankStatementLine, GLTransaction, Invoice } from './reconciliation-types';

/**
 * Ce qu'une écriture de rapprochement renvoie désormais : la ligne de relevé telle qu'elle est
 * après l'opération, et les écritures qui lui sont rattachées. C'est de quoi remettre l'écran à
 * jour sur place, là où il ne savait que se recharger entier.
 */
export interface ReconcileOutcome {
  line: BankStatementLine | null;
  entries: GLTransaction[];
}

async function postAction<T>(body: unknown, fallbackError: string): Promise<T> {
  const res = await fetch('/admin/accounting/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error((await res.text()) || fallbackError);
  return (await res.json()) as T;
}

function toOutcome(json: any): ReconcileOutcome {
  return { line: json?.line ?? null, entries: json?.entries ?? [] };
}

export async function apiLoadUnpaidInvoices(selectedSeason: string): Promise<Invoice[]> {
  const res = await fetch('/admin/accounting/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'get-unpaid-invoices',
      season: selectedSeason
    })
  });
  if (!res.ok) throw new Error('Impossible de charger les factures');
  const json = (await res.json()) as any;
  return (json.data || [])
    .filter((inv: Invoice) => inv.status === 'draft' || inv.status === 'sent')
    .map((inv: any) => ({ ...inv, totalAmount: inv.totalAmount ?? inv.totalAmountCents ?? 0 }));
}

export async function apiBulkReconcile(requests: any[]): Promise<{ lines: BankStatementLine[]; entries: GLTransaction[] }> {
  const json = await postAction<any>({ action: 'bulk', requests }, 'Erreur lors du rapprochement en masse.');
  return { lines: json?.lines ?? [], entries: json?.entries ?? [] };
}

/**
 * Une seule requête, et non une par ligne.
 *
 * Le lot ouvrait autant de POST parallèles que de lignes sélectionnées — deux cents frais
 * bancaires valaient deux cents appels à l'API — et un échec partiel laissait la base dans un
 * état que le message d'erreur ne décrivait pas.
 */
export async function apiBulkIgnore(ids: number[]): Promise<number[]> {
  const json = await postAction<any>({ action: 'status-bulk', ids, status: 'ignored' }, "Certaines transactions n'ont pas pu être ignorées.");
  return json?.ids ?? ids;
}

export async function apiReconcileInvoice(bt: BankStatementLine, invoice: Invoice): Promise<ReconcileOutcome> {
  return toOutcome(await postAction({
      action: 'create',
      btId: bt.id,
      invoiceId: invoice.id,
      transaction: {
        seasonId: invoice.seasonId,
        type: 'recette',
        accountId: bt.accountId,
        category: '1',
        amount: invoice.totalAmount,
        date: bt.date,
        paymentMethod: 'virement',
        description: `Facture ${invoice.invoiceNumber} - ${invoice.clientName}`,
        reference: bt.memo || bt.fitid
      }
  }, 'Erreur association facture.'));
}

export async function apiMultiInvoiceReconcile(bt: BankStatementLine, firstInvoice: Invoice, ids: number[]): Promise<ReconcileOutcome> {
  return toOutcome(await postAction({
      action: 'create',
      btId: bt.id,
      invoiceIds: ids,
      transaction: {
        seasonId: firstInvoice.seasonId,
        type: 'recette',
        accountId: bt.accountId,
        category: '1',
        amount: bt.amount,
        date: bt.date,
        paymentMethod: 'virement',
        description: `Rapprochement de ${ids.length} factures`,
        reference: bt.memo || bt.fitid
      }
  }, 'Erreur association factures.'));
}

export interface ImportSummary {
  read?: number;
  inserted?: number;
  skipped?: number;
  accountCode?: string;
  balanceRecorded?: boolean;
  balanceDate?: string | null;
}

export async function apiImportOfx(file: File, selectedAccount: string): Promise<ImportSummary> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('accountId', selectedAccount);
  const res = await fetch('/admin/accounting/import', { method: 'POST', body: formData });
  if (!res.ok) throw new Error((await res.text()) || 'Erreur importation.');
  try {
    const json = await res.json();
    return (json && typeof json === 'object' ? json : {}) as ImportSummary;
  } catch {
    // Une réponse sans corps exploitable ne doit pas faire échouer un import réussi.
    return {};
  }
}

export async function apiAnalyzeAi(season: string, btId?: number): Promise<{ count: number; lines: BankStatementLine[] }> {
  const body = btId ? { action: 'analyze', season, btId } : { action: 'analyze', season };
  const json = await postAction<any>(body, 'Erreur analyse.');
  return { count: json?.count ?? 0, lines: json?.lines ?? [] };
}

export async function apiMatchLedgerEntry(btId: number, ledgerEntryId: number, memberId: number | null): Promise<ReconcileOutcome> {
  return toOutcome(await postAction({ action: 'match', btId, ledgerEntryId, memberId }, 'Erreur association.'));
}

/**
 * L'exercice de rattachement est transmis, et il ne se déduit pas de la date.
 *
 * `get-season-reports` bâtit le compte de résultat sur `season_id` et la trésorerie sur
 * la **date** : une cotisation encaissée en août pour la rentrée porte la saison
 * suivante et une date d'août, et c'est ce que le cut-off décrit. Le déduire de la date
 * la faisait compter dans le résultat de l'exercice qui se clôture — soit précisément
 * l'erreur que le rattachement est censé empêcher.
 *
 * L'API garde son repli sur la date pour un appelant qui n'en transmet aucun.
 */
export async function apiCreateAndMatchSplit(bt: BankStatementLine, memberId: number | null, targetSeasonId: string, paymentMethod: string, splits: { category: string; amount: number }[], accrualType: string, accrualNote: string): Promise<ReconcileOutcome> {
  return toOutcome(await postAction({
      action: 'create',
      btId: bt.id,
      memberId,
      transactions: splits.map((s, index) => ({
        seasonId: targetSeasonId,
        type: (((bt as any).amountCents ?? bt.amount ?? 0) < 0)
          ? (s.amount >= 0 ? 'depense' : 'recette')
          : (s.amount >= 0 ? 'recette' : 'depense'),
        accountId: bt.accountId || 'current',
        category: s.category,
        amount: Math.round(Math.abs(s.amount) * 100),
        date: bt.date,
        paymentMethod: paymentMethod || 'virement',
        description: `${bt.name} (Partie ${index + 1})`,
        reference: bt.memo || bt.fitid,
        accrualType,
        accrualNote
      }))
  }, 'Erreur création.'));
}

export async function apiCreateAndMatchSingle(
  bt: BankStatementLine,
  memberId: number | null,
  targetSeasonId: string,
  category: string,
  amountToLink: number,
  paymentMethod: string,
  accrualType: string,
  accrualNote: string
): Promise<ReconcileOutcome> {
  const btAmt = (bt as any).amountCents ?? bt.amount ?? 0;
  const rawAccountId = bt.accountId || 'current';
  return toOutcome(await postAction({
      action: 'create',
      btId: bt.id,
      memberId,
      transaction: {
        seasonId: targetSeasonId,
        type: btAmt < 0 ? 'depense' : 'recette',
        accountId: rawAccountId,
        category,
        amount: Math.round(amountToLink * 100),
        date: bt.date,
        paymentMethod: paymentMethod || 'virement',
        description: bt.name,
        reference: bt.memo || bt.fitid,
        accrualType,
        accrualNote
      }
  }, 'Erreur lors du rapprochement.'));
}

/** Dissocier une jambe de virement en supprime deux : c'est le serveur qui dit lesquelles. */
export async function apiDeleteLedgerEntry(txId: number): Promise<{ deletedEntryIds: number[]; resetBankStatementLineIds: number[] }> {
  const json = await postAction<any>({ action: 'delete-transaction', txId }, 'Erreur lors de la suppression.');
  return {
    deletedEntryIds: json?.deletedEntryIds ?? [txId],
    resetBankStatementLineIds: json?.resetBankStatementLineIds ?? []
  };
}

/** L'état de rapprochement par compte — le seul nombre que le client ne peut pas recalculer. */
export async function apiLoadReconciliationStatements(season: string): Promise<any[]> {
  const json = await postAction<any>({ action: 'get-reconciliation-statements', season }, "Impossible de relire l'état de rapprochement.");
  return json?.data ?? [];
}

export async function apiUnignore(btId: number): Promise<void> {
  await postAction({ action: 'unignore', btId }, 'Erreur réactivation.');
}

export async function apiIgnore(btId: number): Promise<void> {
  await postAction({ action: 'ignore', btId }, 'Erreur ignore.');
}
