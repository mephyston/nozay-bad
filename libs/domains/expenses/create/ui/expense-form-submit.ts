export async function submitExpenseReport(params: {
  activeSeasonId: string;
  description: string;
  category: string;
  amountStr: string;
  photoUrl: string | null;
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

  if (!params.photoUrl) {
    return { success: false, error: "Une photo du justificatif est obligatoire pour le remboursement." };
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
          photoUrl: params.photoUrl,
          emitterName: params.emitterName,
          memberId: parseInt(params.selectedMemberId)
        }
      })
    });

    const data = await res.json() as any;
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Une erreur est survenue lors de l'envoi de la note de frais." };
    }

    if (typeof window !== 'undefined' && (window as any).turnstile) {
      (window as any).turnstile.reset();
    }

    return {
      success: true,
      message: "Votre note de frais a été soumise avec succès ! Le trésorier procédera à sa validation et remboursement."
    };
  } catch (err: any) {
    if (typeof window !== 'undefined' && (window as any).turnstile) {
      (window as any).turnstile.reset();
    }
    return { success: false, error: err.message || "Une erreur est survenue." };
  }
}
