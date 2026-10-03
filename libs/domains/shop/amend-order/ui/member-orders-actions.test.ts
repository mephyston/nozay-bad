import { describe, it, expect, vi, afterEach } from 'vitest';
import { annulerCommande, estModifiable, familleDeCommande, modifierCommande } from './member-orders-actions';
import { groupFamilies } from '../../list-products/ui/catalog-families';

const produit = (over: Record<string, unknown>) =>
  ({ name: 'Article', priceCents: 1000, stock: 5, trackStock: true, active: true, productCategoryId: 1, parentId: null, ...over }) as any;

describe('member-orders-actions', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('ne laisse modifier ou annuler que ce que le bureau n’a pas encore traité', () => {
    expect(estModifiable({ status: 'created' })).toBe(true);
    for (const status of ['awaiting_payment', 'paid', 'delivered', 'rejected', 'cancelled']) {
      expect(estModifiable({ status })).toBe(false);
    }
  });

  it('retrouve la carte de l’article commandé, taille comprise', () => {
    const familles = groupFamilies([
      produit({ id: 33, name: 'Maillot', variantCount: 2 }),
      produit({ id: 34, parentId: 33, name: 'Maillot — M', variantLabel: 'M' }),
      produit({ id: 35, parentId: 33, name: 'Maillot — L', variantLabel: 'L' }),
      produit({ id: 7, name: 'Volants' })
    ]);
    expect(familleDeCommande(familles, 35)?.product.id).toBe(33);
    expect(familleDeCommande(familles, 7)?.product.id).toBe(7);
    // Retiré du catalogue : rien à rechoisir, « Modifier » ne s'offre pas.
    expect(familleDeCommande(familles, 99)).toBeNull();
  });

  it("poste l'annulation et la modification à la page, avec l'adhérent de la commande", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });
    vi.stubGlobal('fetch', fetch);

    expect(await annulerCommande({ id: 4, memberId: 9 })).toEqual({ success: true });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ action: 'withdraw', id: 4, memberId: 9 });

    const envoi = modifierCommande({ id: 4, memberId: 9 });
    await envoi({ selectedProduct: produit({ id: 35 }), selectedQuantity: 2, selectedPaymentMethod: 'cheque' });
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
      action: 'amend',
      id: 4,
      memberId: 9,
      productId: 35,
      quantity: 2,
      paymentMethod: 'cheque'
    });
  });

  it("rend l'erreur de l'API telle quelle", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ success: false, error: 'Déjà traitée.' }) })
    );
    expect(await annulerCommande({ id: 4, memberId: 9 })).toEqual({ success: false, error: 'Déjà traitée.' });
  });

  it("n'envoie pas une taille en rupture", async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const res = await modifierCommande({ id: 4, memberId: 9 })({
      selectedProduct: produit({ id: 35, stock: 0 }),
      selectedQuantity: 1,
      selectedPaymentMethod: 'cheque'
    });
    expect(res.success).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
