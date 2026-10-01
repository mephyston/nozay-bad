import { uiConfirm, flashAndReload } from '@nba/ui';

/**
 * Destination des écritures : le relais du domaine, et non la page hôte.
 *
 * Le catalogue de l'espace adhérent garde la sienne : il vit dans le storefront, et lui
 * donner une adresse d'administration l'aurait cassé sans que rien ne le signale.
 */
const RELAIS = '/admin/api/shop/orders';

export async function getErrorMessage(res: Response, defaultMsg: string): Promise<string> {
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return json.error || json.message || defaultMsg;
    } catch {
      return text || defaultMsg;
    }
  } catch {
    return defaultMsg;
  }
}

export interface OrderActionResult {
  success: boolean;
  error?: string;
}

/**
 * Poste une transition de commande à la page admin courante.
 *
 * `flash` n'est émis qu'en cas de succès : un refus laisse la page en l'état, avec
 * l'erreur affichée en place.
 */
async function postOrderAction(
  action: string,
  orderId: number,
  messages: { error: string; flash: string },
  payload: Record<string, unknown> = {}
): Promise<OrderActionResult> {
  try {
    const res = await fetch(RELAIS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, id: orderId, ...payload })
    });

    if (!res.ok) {
      return { success: false, error: await getErrorMessage(res, messages.error) };
    }

    flashAndReload(messages.flash);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Une erreur est survenue' };
  }
}

/** Créée → en attente de paiement. Réserve le stock, n'écrit rien en compta. */
export async function validateOrder(orderId: number): Promise<OrderActionResult> {
  return postOrderAction('validate', orderId, {
    error: 'Erreur lors de la validation',
    flash: 'Commande validée : en attente de paiement.'
  });
}

/** En attente de paiement → payée. Génère l'écriture de recette. */
export async function payOrder(orderId: number, paidAt?: string): Promise<OrderActionResult> {
  return postOrderAction(
    'pay',
    orderId,
    { error: "Erreur lors de l'encaissement", flash: 'Commande payée : recette enregistrée.' },
    paidAt ? { paidAt } : {}
  );
}

/**
 * Créée → refusée, avec un motif facultatif.
 *
 * Pas de `uiConfirm` ici : la feuille de refus, où le motif se saisit, tient lieu de
 * confirmation.
 */
export async function rejectOrder(orderId: number, reason = ''): Promise<OrderActionResult> {
  return postOrderAction(
    'reject',
    orderId,
    { error: 'Erreur lors du refus', flash: 'Commande refusée.' },
    reason.trim() ? { reason: reason.trim() } : {}
  );
}

export async function cancelOrder(orderId: number): Promise<OrderActionResult> {
  if (
    !(await uiConfirm(
      "Annuler cette commande faute de règlement ? Le stock réservé sera rendu."
    ))
  ) {
    return { success: false };
  }

  return postOrderAction('cancel', orderId, {
    error: "Erreur lors de l'annulation",
    flash: 'Commande annulée.'
  });
}

/**
 * Payée → livrée. Aucune écriture, aucun mouvement de stock : l'article est remis.
 *
 * Pas de confirmation : la remise se défait d'un geste depuis l'historique.
 */
export async function deliverOrder(orderId: number): Promise<OrderActionResult> {
  return postOrderAction('deliver', orderId, {
    error: 'Erreur lors de la remise',
    flash: 'Commande livrée.'
  });
}

/** Livrée → payée, quand on a coché la mauvaise ligne. La recette n'est pas touchée. */
export async function undeliverOrder(orderId: number): Promise<OrderActionResult> {
  return postOrderAction('undeliver', orderId, {
    error: "Erreur lors de l'annulation de la remise",
    flash: 'Remise annulée : la commande est de nouveau à livrer.'
  });
}

/**
 * Payée → en attente de paiement. Retire la recette du grand livre.
 *
 * Le cas d'usage est l'erreur de ligne : on a encaissé la commande du voisin. Avant,
 * aucun retour n'existait, et supprimer la recette à la main laissait la commande
 * « payée » avec une écriture fantôme.
 */
export async function unpayOrder(orderId: number): Promise<OrderActionResult> {
  if (
    !(await uiConfirm(
      "Annuler l'encaissement de cette commande ? La recette sera retirée du grand livre et la commande repassera en attente de paiement."
    ))
  ) {
    return { success: false };
  }

  return postOrderAction('unpay', orderId, {
    error: "Erreur lors de l'annulation de l'encaissement",
    flash: 'Encaissement annulé : la commande est de nouveau en attente de paiement.'
  });
}
