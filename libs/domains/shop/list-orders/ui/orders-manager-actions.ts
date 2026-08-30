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

export async function rejectOrder(orderId: number): Promise<OrderActionResult> {
  if (!(await uiConfirm('Êtes-vous sûr de vouloir refuser cette commande ?'))) {
    return { success: false };
  }

  return postOrderAction('reject', orderId, {
    error: 'Erreur lors du refus',
    flash: 'Commande refusée.'
  });
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
