import { uiConfirm, flashAndReload } from '@nba/ui';

/**
 * Destination des écritures : le relais du domaine, et non la page hôte.
 *
 * L'adresse de la page était écrite en dur ici — ce qui liait ce module à l'écran qui
 * l'hébergeait, sans que rien ne le rappelle. Le jour où la page a cessé de porter un
 * gestionnaire `POST`, elle aurait répondu 404 sans que personne ne l'ait vu venir.
 */
const RELAIS = '/admin/api/accounting/cash-box';

export interface CashMovementFormValues {
  seasonId: string;
  type: 'recette' | 'depense';
  amount: string;
  date: string;
  category: string;
  description: string;
}

export function validateCashMovement(params: CashMovementFormValues): string | null {
  const numAmount = parseFloat(params.amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return 'Le montant doit être supérieur à 0.';
  }
  return null;
}

export async function submitCashMovement(params: CashMovementFormValues): Promise<void> {
  const numAmount = parseFloat(params.amount);

  const res = await fetch(RELAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      seasonId: params.seasonId,
      type: params.type,
      accountId: 'cash',
      category: params.category,
      amount: Math.round(numAmount * 100),
      date: params.date,
      paymentMethod: 'especes',
      description: params.description
    })
  });

  if (!res.ok) {
    throw new Error((await res.text()) || "Erreur lors de l'enregistrement.");
  }
}

export async function deleteCashMovement(id: number): Promise<boolean> {
  if (!(await uiConfirm('Êtes-vous sûr de vouloir supprimer ce mouvement de caisse ?'))) return false;

  const res = await fetch(RELAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id })
  });

  if (!res.ok) throw new Error('Impossible de supprimer.');
  flashAndReload('Mouvement de caisse supprimé.');
  return true;
}
