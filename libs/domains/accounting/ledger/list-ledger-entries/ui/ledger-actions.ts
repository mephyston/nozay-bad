import type { Transaction } from './ledger-types';

export async function submitTransaction(
  e: Event,
  params: {
    editingId: number | null;
    showPanel: 'recette' | 'depense' | 'transfert' | null;
    amount: string;
    date: string;
    category: string;
    formAccountId: string;
    destinationAccountId: string;
    paymentMethod: string;
    description: string;
    reference: string;
    accrualType: string;
    accrualNote: string;
    targetSeasonId: string;
  }
): Promise<void> {
  e.preventDefault();
  const floatAmount = parseFloat(params.amount);
  if (isNaN(floatAmount) || floatAmount <= 0) {
    throw new Error('Le montant doit être un nombre positif.');
  }

  const payload = params.editingId
    ? {
        action: 'update',
        id: params.editingId,
        updates: {
          seasonId: params.targetSeasonId,
          type: params.showPanel,
          accountId: params.formAccountId,
          destinationAccountId: params.showPanel === 'transfert' ? params.destinationAccountId : null,
          category: params.showPanel !== 'transfert' ? params.category : null,
          amount: Math.round(floatAmount * 100),
          date: params.date,
          paymentMethod: params.paymentMethod,
          description: params.description,
          reference: params.reference,
          accrualType: params.accrualType,
          accrualNote: params.accrualNote
        }
      }
    : {
        action: 'create',
        seasonId: params.targetSeasonId,
        type: params.showPanel,
        accountId: params.formAccountId,
        destinationAccountId: params.showPanel === 'transfert' ? params.destinationAccountId : null,
        category: params.showPanel !== 'transfert' ? params.category : null,
        amount: Math.round(floatAmount * 100),
        date: params.date,
        paymentMethod: params.paymentMethod,
        description: params.description,
        reference: params.reference,
        accrualType: params.accrualType,
        accrualNote: params.accrualNote
      };

  const res = await fetch('/admin/accounting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error((await res.text()) || 'Impossible d\'enregistrer la transaction');
  
  if (params.editingId) {
    sessionStorage.setItem('scrollToTx', params.editingId.toString());
  }
  
  window.location.reload();
}

export async function deleteTransaction(id: number): Promise<void> {
  const res = await fetch('/admin/accounting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id })
  });
  if (!res.ok) throw new Error('Impossible de supprimer.');
  window.location.reload();
}

export function changePage(newPage: number, totalPages: number) {
  if (newPage < 1 || newPage > totalPages) return;
  const params = new URLSearchParams(window.location.search);
  params.set('page', newPage.toString());
  window.location.href = `/admin/accounting?${params.toString()}`;
}

export function applySeasonChange(selectedSeason: string) {
  const params = new URLSearchParams(window.location.search);
  params.set('season', selectedSeason);
  params.set('page', '1');
  window.location.href = `/admin/accounting?${params.toString()}`;
}
