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
  return (json.data || []).filter((inv: Invoice) => inv.status === 'draft' || inv.status === 'sent');
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
        reference: bt.fitid
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
        reference: bt.fitid
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

export async function apiCreateAndMatchSplit(bt: BankStatementLine, memberId: number | null, splits: { category: string; amount: number }[]): Promise<void> {
  const res = await fetch('/admin/accounting/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      btId: bt.id,
      memberId,
      transactions: splits.map((s, index) => ({
        seasonId: bt.accountId,
        type: bt.amount < 0 ? 'depense' : 'recette',
        accountId: bt.accountId,
        category: s.category,
        amount: Math.round(s.amount * 100),
        date: bt.date,
        paymentMethod: 'virement',
        description: `${bt.name} (Partie ${index + 1})`,
        reference: bt.fitid
      }))
    })
  });
  if (!res.ok) throw new Error('Erreur création.');
}

export async function apiCreateAndMatchSingle(
  bt: BankStatementLine,
  memberId: number | null,
  targetSeasonId: string,
  category: string,
  amountToLink: number,
  paymentMethod: string
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
        seasonId: targetSeasonId,
        type: btAmt < 0 ? 'depense' : 'recette',
        accountId: rawAccountId,
        category,
        amount: Math.round(amountToLink * 100),
        date: bt.date,
        paymentMethod: paymentMethod || 'virement',
        description: bt.name,
        reference: bt.fitid
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
