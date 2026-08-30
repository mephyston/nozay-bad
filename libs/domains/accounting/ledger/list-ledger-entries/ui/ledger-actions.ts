import { softNavigate } from '@nba/ui';
import type { Transaction } from './ledger-types';

/**
 * Destination des écritures : le relais du domaine, et non la page hôte.
 *
 * L'adresse de la page était écrite en dur ici — ce qui liait ce module à l'écran qui
 * l'hébergeait, sans que rien ne le rappelle. Le jour où la page a cessé de porter un
 * gestionnaire `POST`, elle aurait répondu 404 sans que personne ne l'ait vu venir.
 */
const RELAIS = '/admin/api/accounting/ledger';

export interface TransactionFormValues {
  editingId: number | null;
  showPanel: 'recette' | 'depense' | 'transfert' | null;
  amount: string;
  date: string;
  category: string;
  formAccountId: string;
  destinationAccountId: string;
  /** Date de valeur au crédit du compte destinataire ; vide = le même jour que le débit. */
  destinationDate: string;
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
  if (params.showPanel === 'transfert') {
    if (!params.destinationAccountId || params.destinationAccountId === params.formAccountId) {
      return 'Le compte destinataire doit être différent du compte source.';
    }
    if (params.destinationDate && params.destinationDate < params.date) {
      return "L'argent ne peut pas arriver avant d'être parti : la date de crédit précède celle du débit.";
    }
  }
  return null;
}

export async function submitTransaction(params: TransactionFormValues): Promise<void> {
  const floatAmount = parseFloat(params.amount);

  /*
   * Un virement n'emprunte pas la même route qu'une recette : il écrit **deux** écritures, une
   * par compte, chacune avec sa date de valeur et son propre pointage bancaire. La route du grand
   * livre n'en écrit qu'une et refuse désormais franchement le type `transfert`.
   */
  if (params.showPanel === 'transfert' && !params.editingId) {
    const res = await fetch(RELAIS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create-transfer',
        seasonId: params.targetSeasonId,
        sourceAccountId: params.formAccountId,
        destinationAccountId: params.destinationAccountId,
        amountCents: Math.round(floatAmount * 100),
        sourceDate: params.date,
        destinationDate: params.destinationDate || params.date,
        description: params.description,
        reference: params.reference || null
      })
    });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
    if (!res.ok || json?.success === false) {
      throw new Error(json?.error || "Le virement n'a pas pu être enregistré.");
    }
    softNavigate(window.location.href);
    return;
  }

  const payload = params.editingId
    ? {
        action: 'update',
        id: params.editingId,
        updates: {
          seasonId: params.targetSeasonId,
          type: params.showPanel,
          accountId: params.formAccountId,
          category: params.category,
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
        category: params.category,
        amount: Math.round(floatAmount * 100),
        date: params.date,
        paymentMethod: params.paymentMethod,
        description: params.description,
        reference: params.reference,
        accrualType: params.accrualType,
        accrualNote: params.accrualNote
      };

  const res = await fetch(RELAIS, {
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
  const res = await fetch(RELAIS, {
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
