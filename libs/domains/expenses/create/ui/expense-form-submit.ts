import type { PieceJointe } from '../../shared/justificatif';

export async function submitExpenseReport(params: {
  activeSeasonId: string;
  description: string;
  category: string;
  amountStr: string;
  pieces: PieceJointe[];
  emitterName: string;
  selectedMemberId: string;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  if (!params.selectedMemberId) {
    return { success: false, error: "Veuillez sélectionner un demandeur dans la liste." };
  }

  const parsedAmount = parseFloat(params.amountStr);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return { success: false, error: "Veuillez saisir un montant supérieur à 0 €." };
  }

  if (params.pieces.length === 0) {
    return { success: false, error: "Au moins un justificatif (photo ou PDF) est obligatoire pour le remboursement." };
  }

  try {
    const res = await fetch('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'expense',
        data: {
          seasonId: params.activeSeasonId,
          description: params.description,
          category: params.category,
          amount: Math.round(parsedAmount * 100),
          attachments: params.pieces.map((p) => p.dataUrl),
          emitterName: params.emitterName,
          memberId: parseInt(params.selectedMemberId)
        }
      })
    });

    const data = await res.json() as any;
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Une erreur est survenue lors de l'envoi de la note de frais." };
    }

    /*
      Plus d'appel à `turnstile.reset()` ici : le layout charge Turnstile pour la page de
      connexion, mais ce formulaire n'a aucun widget. `reset()` levait donc après un envoi
      réussi, le `catch` relevait à son tour, et le bouton restait sur « Soumission en
      cours… » alors que la note était enregistrée.
    */
    return {
      success: true,
      message: "Votre note de frais a été soumise avec succès ! Le trésorier procédera à sa validation et remboursement."
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Une erreur est survenue." };
  }
}
