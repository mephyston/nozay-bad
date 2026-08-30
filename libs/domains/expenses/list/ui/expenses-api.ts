
/**
 * Destination des écritures : le relais du domaine, et non la page hôte.
 *
 * Le formulaire de l'espace adhérent garde la sienne : il vit dans le storefront.
 */
const RELAIS = '/admin/api/expenses/list';
export async function saveExpenseEdit(id: number, updates: {
  description: string;
  category: string;
  seasonId: string;
  amount: number;
}): Promise<string> {
  const res = await fetch(RELAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update',
      id,
      updates
    })
  });

  if (!res.ok) {
    throw new Error("Erreur lors de la mise à jour de la note de frais.");
  }

  return "Note de frais mise à jour avec succès.";
}

export async function handleExpenseAction(id: number, action: 'approve' | 'reject'): Promise<string> {
  const res = await fetch(RELAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, id })
  });

  if (!res.ok) {
    throw new Error(action === 'approve' ? "Erreur lors de l'approbation" : "Erreur lors du rejet");
  }

  return action === 'approve'
    ? "Note de frais approuvée et remboursée avec succès."
    : "Note de frais rejetée.";
}

export async function cancelExpenseValidation(id: number): Promise<string> {
  const res = await fetch(RELAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'cancel', id })
  });

  if (!res.ok) {
    throw new Error("Erreur lors de l'annulation de la validation.");
  }

  return "Note de frais remise en attente et transaction supprimée de la comptabilité.";
}
