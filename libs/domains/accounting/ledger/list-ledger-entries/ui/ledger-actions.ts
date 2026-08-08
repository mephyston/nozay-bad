import { softNavigate } from '@nba/ui';
import type { Transaction } from './ledger-types';

export interface TransactionFormValues {
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

export function validateTransaction(params: TransactionFormValues): string | null {
  const floatAmount = parseFloat(params.amount);
  if (isNaN(floatAmount) || floatAmount <= 0) {
    return 'Le montant doit être un nombre positif.';
  }
  return null;
}

export async function submitTransaction(params: TransactionFormValues): Promise<void> {
  const floatAmount = parseFloat(params.amount);

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

  if (!res.ok) {
    let errStr = await res.text();
    try {
      const parsed = JSON.parse(errStr);
      if (parsed.error) errStr = parsed.error;
    } catch(e){}
    throw new Error(errStr || 'Impossible d\'enregistrer la transaction');
  }
  
  // La liste réaffichée doit se recaler sur la ligne que l'on vient de modifier.
  if (params.editingId) {
    sessionStorage.setItem('scrollToTx', params.editingId.toString());
  }
}

export async function deleteTransaction(id: number): Promise<void> {
  const res = await fetch('/admin/accounting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id })
  });
  if (!res.ok) {
    let errStr = await res.text();
    try {
      const parsed = JSON.parse(errStr);
      if (parsed.error) errStr = parsed.error;
    } catch(e){}
    throw new Error(errStr || 'Impossible de supprimer.');
  }
}

export function changePage(newPage: number, totalPages: number) {
  if (newPage < 1 || newPage > totalPages) return;
  const params = new URLSearchParams(window.location.search);
  params.set('page', newPage.toString());
  softNavigate(`/admin/accounting?${params.toString()}`);
}

export function applySeasonChange(selectedSeason: string) {
  const params = new URLSearchParams(window.location.search);
  params.set('season', selectedSeason);
  params.set('page', '1');
  softNavigate(`/admin/accounting?${params.toString()}`);
}
