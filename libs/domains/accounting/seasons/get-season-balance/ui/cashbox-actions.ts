import { uiConfirm } from '@nba/ui';

export async function submitCashMovement(params: {
  seasonId: string;
  type: 'recette' | 'depense';
  amount: string;
  date: string;
  category: string;
  description: string;
}): Promise<{ success: boolean; error?: string }> {
  const numAmount = parseFloat(params.amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return { success: false, error: 'Le montant doit être supérieur à 0.' };
  }

  try {
    const res = await fetch('/admin/accounting/cash-box', {
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
      const errBody = await res.text();
      return { success: false, error: errBody || "Erreur lors de l'enregistrement." };
    }

    setTimeout(() => {
      window.location.reload();
    }, 1000);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Une erreur est survenue.' };
  }
}

export async function deleteCashMovement(id: number): Promise<boolean> {
  if (!(await uiConfirm('Êtes-vous sûr de vouloir supprimer ce mouvement de caisse ?'))) return false;

  const res = await fetch('/admin/accounting/cash-box', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id })
  });

  if (!res.ok) throw new Error('Impossible de supprimer.');
  window.location.reload();
  return true;
}
