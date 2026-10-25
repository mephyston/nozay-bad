
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
  attachments?: ({ id: number } | { dataUrl: string })[];
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
    // Le motif de l'API d'abord : « une pièce de trop » se corrige, « erreur » non.
    const corps = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(corps?.error || "Erreur lors de la mise à jour de la note de frais.");
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

/** Le contenu d'une pièce jointe (adresse `data:`), lu à l'ouverture et non avec la liste. */
export async function lirePiece(expenseId: number, pieceId: number): Promise<string> {
  const res = await fetch(`/admin/api/expenses/justificatif?id=${expenseId}&piece=${pieceId}`);
  const corps = (await res.json().catch(() => null)) as { data?: { piece?: { dataUrl?: string } } } | null;
  const dataUrl = corps?.data?.piece?.dataUrl;
  if (!res.ok || !dataUrl) throw new Error('Justificatif illisible.');
  return dataUrl;
}
