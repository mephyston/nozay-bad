import type { Product } from '../../list-products/ui/catalog-types';
import { isOutOfStock, productLabel } from '../../list-products/ui/catalog-types';
import type { ProductFamily } from '../../list-products/ui/catalog-families';

/**
 * Les deux gestes de l'adhérent sur une commande pas encore validée : la modifier, ou
 * l'annuler. Ils partent vers la page « Mes commandes » elle-même, qui pose l'adhérent
 * depuis la session avant de relayer à l'API — jamais l'identifiant envoyé seul.
 */

export interface MemberOrderRow {
  id: number;
  memberId: number;
  productId: number;
  productName: string;
  quantity: number;
  totalCents: number;
  /** Le code du moyen de paiement, pour rouvrir la feuille sur le bon choix. */
  paymentMethod: string;
  status: string;
  createdAt: string | null;
  rejectionReason: string | null;
  /** Libellé et classes du statut, calculés par la page : ils vivent dans l'espace adhérent. */
  statutLabel: string;
  statutClasse: string;
}

/** Seule une commande que le bureau n'a pas encore traitée se modifie ou s'annule d'ici. */
export const estModifiable = (row: Pick<MemberOrderRow, 'status'>): boolean => row.status === 'created';

/** La carte de la boutique où vit l'article commandé : le produit seul, ou le parent d'une taille. */
export function familleDeCommande(families: ProductFamily[], productId: number): ProductFamily | null {
  return families.find((f) => f.choices.some((c) => c.id === productId)) ?? null;
}

type Resultat = { success: boolean; error?: string };

async function poster(payload: Record<string, unknown>, defaut: string): Promise<Resultat> {
  try {
    const res = await fetch('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || !data.success) return { success: false, error: data.error || defaut };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || defaut };
  }
}

export function annulerCommande(row: Pick<MemberOrderRow, 'id' | 'memberId'>): Promise<Resultat> {
  return poster({ action: 'withdraw', id: row.id, memberId: row.memberId }, "L'annulation de la commande a échoué.");
}

/** La modification, à la signature de l'envoi de la feuille de commande. */
export function modifierCommande(row: Pick<MemberOrderRow, 'id' | 'memberId'>) {
  return async (params: {
    selectedProduct: Product | null;
    selectedQuantity: number;
    selectedPaymentMethod: string;
  }): Promise<Resultat> => {
    const produit = params.selectedProduct;
    if (!produit) return { success: false, error: 'Veuillez sélectionner un produit.' };
    if (isOutOfStock(produit)) return { success: false, error: `« ${productLabel(produit)} » est en rupture de stock.` };
    return poster(
      {
        action: 'amend',
        id: row.id,
        memberId: row.memberId,
        productId: produit.id,
        quantity: params.selectedQuantity,
        paymentMethod: params.selectedPaymentMethod
      },
      'La modification de la commande a échoué.'
    );
  };
}
