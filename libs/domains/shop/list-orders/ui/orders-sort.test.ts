import { describe, it, expect } from 'vitest';
import type { OrderItem } from './orders-manager-types';
import { basculerTri, sensDe, trierCommandes } from './orders-sort';

function commande(id: number, order: Partial<OrderItem['order']> = {}, item: Partial<OrderItem> = {}): OrderItem {
  return {
    order: {
      id,
      seasonId: '25-26',
      memberId: id,
      productId: 100,
      quantity: 1,
      totalAmount: 1000,
      paymentMethod: 'virement',
      status: 'created',
      awaitingPaymentSince: null,
      ledgerEntryId: null,
      createdAt: '2026-08-01T10:00:00Z',
      ...order
    },
    member: { id, firstName: 'Ana', lastName: 'Martin', licence: '0001' },
    product: { id: 100, name: 'Volants', price: 1000, stock: 10, active: true, category: 'Matériel' },
    ...item
  };
}

const ids = (items: OrderItem[]) => items.map((i) => i.order.id);

describe('basculerTri', () => {
  it('trie en croissant au premier clic, puis inverse le sens à chaque clic', () => {
    const un = basculerTri(null, 'montant');
    expect(un).toEqual({ colonne: 'montant', sens: 'asc' });
    const deux = basculerTri(un, 'montant');
    expect(deux).toEqual({ colonne: 'montant', sens: 'desc' });
    expect(basculerTri(deux, 'montant')).toEqual({ colonne: 'montant', sens: 'asc' });
  });

  it('repart en croissant quand on change de colonne', () => {
    expect(basculerTri({ colonne: 'montant', sens: 'desc' }, 'date')).toEqual({ colonne: 'date', sens: 'asc' });
  });

  it("n'affiche un sens que sur la colonne triée", () => {
    const tri = { colonne: 'date', sens: 'desc' } as const;
    expect(sensDe(tri, 'date')).toBe('desc');
    expect(sensDe(tri, 'montant')).toBeNull();
    expect(sensDe(null, 'date')).toBeNull();
  });
});

describe('trierCommandes', () => {
  it("garde l'ordre servi sans tri choisi", () => {
    const items = [commande(2), commande(1)];
    expect(trierCommandes(items, null)).toBe(items);
  });

  it('trie les montants et les dates comme des nombres, dans les deux sens', () => {
    const items = [
      commande(1, { totalAmount: 900, createdAt: '2026-08-03T10:00:00Z' }),
      commande(2, { totalAmount: 10000, createdAt: '2026-08-01T10:00:00Z' }),
      commande(3, { totalAmount: 2500, createdAt: '2026-08-02T10:00:00Z' })
    ];
    expect(ids(trierCommandes(items, { colonne: 'montant', sens: 'asc' }))).toEqual([1, 3, 2]);
    expect(ids(trierCommandes(items, { colonne: 'montant', sens: 'desc' }))).toEqual([2, 3, 1]);
    expect(ids(trierCommandes(items, { colonne: 'date', sens: 'asc' }))).toEqual([2, 3, 1]);
  });

  it("range les adhérents à la française, accents et casse ignorés, sans toucher l'original", () => {
    const items = [
      commande(1, {}, { member: { id: 1, firstName: 'Léa', lastName: 'Zola', licence: '1' } }),
      commande(2, {}, { member: { id: 2, firstName: 'Paul', lastName: 'émile', licence: '2' } }),
      commande(3, {}, { member: { id: 3, firstName: 'Ana', lastName: 'Dupont', licence: '3' } })
    ];
    expect(ids(trierCommandes(items, { colonne: 'adherent', sens: 'asc' }))).toEqual([3, 2, 1]);
    expect(ids(items)).toEqual([1, 2, 3]);
  });

  it('laisse les valeurs absentes en bas, quel que soit le sens', () => {
    const items = [
      commande(1, {}, { product: undefined }),
      commande(2, {}, { product: { id: 1, name: 'Maillot', price: 1, stock: 1, active: true, category: 'x' } }),
      commande(3, {}, { product: { id: 2, name: 'Grip', price: 1, stock: 1, active: true, category: 'x' } })
    ];
    expect(ids(trierCommandes(items, { colonne: 'produit', sens: 'asc' }))).toEqual([3, 2, 1]);
    expect(ids(trierCommandes(items, { colonne: 'produit', sens: 'desc' }))).toEqual([2, 3, 1]);
  });

  it("range les statuts dans l'ordre du parcours", () => {
    const items = [
      commande(1, { status: 'paid' }),
      commande(2, { status: 'created' }),
      commande(3, { status: 'awaiting_payment' })
    ];
    expect(ids(trierCommandes(items, { colonne: 'statut', sens: 'asc' }))).toEqual([2, 3, 1]);
  });
});
