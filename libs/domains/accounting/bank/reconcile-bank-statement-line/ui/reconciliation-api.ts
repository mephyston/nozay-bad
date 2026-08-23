import type { BankStatementLine, Invoice } from './reconciliation-types';

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

export async function apiBulkReconcile(requests: any[]): Promise<void> {
  const res = await fetch('/admin/accounting/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'bulk', requests })
  });
  if (!res.ok) throw new Error((await res.text()) || 'Erreur lors du rapprochement en masse.');
}

export async function apiBulkIgnore(ids: number[]): Promise<void> {
  const promises = ids.map(btId =>
    fetch('/admin/accounting/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ignore', btId })
    })
  );
  const responses = await Promise.all(promises);
  if (responses.some(r => !r.ok)) {
    throw new Error("Certaines transactions n'ont pas pu être ignorées.");
  }
}

export async function apiReconcileInvoice(bt: BankStatementLine, invoice: Invoice): Promise<void> {
  const res = await fetch('/admin/accounting/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
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
    })
  });
  if (!res.ok) throw new Error('Erreur association facture.');
}

export async function apiMultiInvoiceReconcile(bt: BankStatementLine, firstInvoice: Invoice, ids: number[]): Promise<void> {
  const res = await fetch('/admin/accounting/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
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
    })
  });
  if (!res.ok) throw new Error('Erreur association factures.');
}

export async function apiImportOfx(file: File, selectedAccount: string): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('accountId', selectedAccount);
  const res = await fetch('/admin/accounting/import', { method: 'POST', body: formData });
  if (!res.ok) throw new Error((await res.text()) || 'Erreur importation.');
}

export async function apiAnalyzeAi(season: string, btId?: number): Promise<void> {
  const body = btId ? { action: 'analyze', season, btId } : { action: 'analyze', season };
  const res = await fetch('/admin/accounting/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error((await res.text()) || 'Erreur analyse.');
}

export async function apiMatchLedgerEntry(btId: number, ledgerEntryId: number, memberId: number | null): Promise<void> {
  const res = await fetch('/admin/accounting/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'match', btId, ledgerEntryId, memberId })
  });
  if (!res.ok) throw new Error('Erreur association.');
}

/**
 * L'exercice n'est **pas** transmis : il se déduit de la date de l'écriture.
 *
 * Une saison est un intervalle de dates, et une écriture datée du 21 août appartient à
 * l'exercice qui contient ce jour-là — ce n'est pas une préférence d'écran. L'imposer
 * depuis le client faisait du sélecteur de l'en-tête, qui ne filtre rien, l'arbitre d'un
 * rattachement comptable. Quand l'argent appartient économiquement à une autre saison,
 * c'est le cut-off qui le dit, pas le millésime de l'écriture.
 */
export async function apiCreateAndMatchSplit(bt: BankStatementLine, memberId: number | null, paymentMethod: string, splits: { category: string; amount: number }[], accrualType: string, accrualNote: string): Promise<void> {
  const res = await fetch('/admin/accounting/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      btId: bt.id,
      memberId,
      transactions: splits.map((s, index) => ({
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
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || 'Erreur création.');
  }
}

export async function apiCreateAndMatchSingle(
  bt: BankStatementLine,
  memberId: number | null,
  category: string,
  amountToLink: number,
  paymentMethod: string,
  accrualType: string,
  accrualNote: string
): Promise<void> {
  const btAmt = (bt as any).amountCents ?? bt.amount ?? 0;
  const rawAccountId = bt.accountId || 'current';
  const res = await fetch('/admin/accounting/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      btId: bt.id,
      memberId,
      transaction: {
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
    })
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Erreur lors du rapprochement.');
  }
}

export async function apiDeleteLedgerEntry(txId: number): Promise<void> {
  const res = await fetch('/admin/accounting/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete-transaction', txId })
  });
  if (!res.ok) throw new Error('Erreur lors de la suppression.');
}

export async function apiUnignore(btId: number): Promise<void> {
  const res = await fetch('/admin/accounting/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'unignore', btId })
  });
  if (!res.ok) throw new Error('Erreur réactivation.');
}

export async function apiIgnore(btId: number): Promise<void> {
  const res = await fetch('/admin/accounting/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'ignore', btId })
  });
  if (!res.ok) throw new Error('Erreur ignore.');
}
