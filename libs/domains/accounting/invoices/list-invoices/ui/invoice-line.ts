import type { InvoiceFormItem } from './invoices-types';

/**
 * Le montant d'une ligne de facture, en centimes, tel que le formulaire le saisit.
 *
 * Écrit une fois : le total de la facture en est la somme, et chaque ligne l'affiche sous
 * ses champs. Le prix accepte la virgule, comme on l'écrit en France.
 */
export function montantDeLigne(item: Pick<InvoiceFormItem, 'quantity' | 'unitPriceStr'>): number {
  const quantite = item.quantity || 0;
  const prix = parseFloat(String(item.unitPriceStr ?? '').replace(',', '.')) || 0;
  return quantite * Math.round(prix * 100);
}
