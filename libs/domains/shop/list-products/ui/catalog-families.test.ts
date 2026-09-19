import { describe, it, expect } from 'vitest';
import { familyCategories, groupFamilies } from './catalog-families';
import type { Product } from './catalog-types';

const p = (over: Partial<Product> & { id: number }): Product => ({
  name: 'Produit',
  productCategoryId: 3,
  categoryLabel: 'Textile',
  priceCents: 1000,
  stock: 0,
  trackStock: false,
  active: true,
  parentId: null,
  ...over
});

describe('groupFamilies', () => {
  it('fait une carte par produit, les déclinaisons rangées sous leur parent', () => {
    const families = groupFamilies([
      p({ id: 1, name: 'Maillot' }),
      p({ id: 2, name: 'Maillot', parentId: 1, variantLabel: 'S', priceCents: 1000 }),
      p({ id: 3, name: 'Maillot', parentId: 1, variantLabel: 'L', priceCents: 1200 }),
      p({ id: 4, name: 'Volants', productCategoryId: 1, categoryLabel: 'Volants', priceCents: 1980 })
    ]);
    expect(families.map((f) => f.product.name)).toEqual(['Maillot', 'Volants']);
    expect(families[0].variants.map((v) => v.variantLabel)).toEqual(['S', 'L']);
    expect(families[0].choices).toHaveLength(2);
    expect(families[0].priceMinCents).toBe(1000);
    expect(families[0].priceMaxCents).toBe(1200);
    // Un produit seul se commande lui-même.
    expect(families[1].choices.map((c) => c.id)).toEqual([4]);
    expect(families[1].priceMinCents).toBe(1980);
  });

  it('déclare la famille épuisée quand rien ne se commande plus', () => {
    const families = groupFamilies([
      p({ id: 1, name: 'Maillot' }),
      p({ id: 2, parentId: 1, variantLabel: 'S', trackStock: true, stock: 0 }),
      p({ id: 3, parentId: 1, variantLabel: 'L', trackStock: true, stock: 2 }),
      p({ id: 4, name: 'Grip', trackStock: true, stock: 0 })
    ]);
    expect(families[0].soldOut).toBe(false);
    expect(families[1].soldOut).toBe(true);
  });

  it('n’offre pas un parent à la commande quand ses déclinaisons sont toutes retirées', () => {
    const families = groupFamilies([p({ id: 1, name: 'Maillot', variantCount: 3 })]);
    expect(families[0].choices).toEqual([]);
    expect(families[0].soldOut).toBe(true);
    expect(families[0].priceMinCents).toBe(1000);
  });

  it('ignore une déclinaison dont le parent manque de la liste', () => {
    const families = groupFamilies([p({ id: 2, parentId: 99, variantLabel: 'S' })]);
    expect(families).toEqual([]);
  });
});

describe('familyCategories', () => {
  it('liste chaque catégorie une fois, dans l’ordre d’apparition', () => {
    const families = groupFamilies([
      p({ id: 1, productCategoryId: 3, categoryLabel: 'Textile' }),
      p({ id: 2, productCategoryId: 1, categoryLabel: 'Volants' }),
      p({ id: 3, productCategoryId: 3, categoryLabel: 'Textile' })
    ]);
    expect(familyCategories(families)).toEqual([{ id: 3, label: 'Textile' }, { id: 1, label: 'Volants' }]);
  });
});
