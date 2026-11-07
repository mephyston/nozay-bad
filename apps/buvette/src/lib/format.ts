export const euros = (cents: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);

export const MOVEMENT_LABELS: Record<string, string> = {
  recharge: 'Recharge',
  debit: 'Achat à la buvette',
  refund: 'Remboursement du solde',
  cancel: 'Annulation',
  transfer: 'Transfert depuis une carte papier'
};

/** Rendue côté serveur, la date a besoin du fuseau du club : le Worker tourne en UTC. */
export const dateTime = (value: string | Date, timeZone?: string) =>
  new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone });

export const signedEuros = (cents: number) => `${cents > 0 ? '+' : ''}${euros(cents)}`;
