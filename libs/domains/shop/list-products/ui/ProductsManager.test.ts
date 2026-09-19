import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import ProductsManager from './ProductsManager.svelte';
import type { Product } from './products-manager-types';

describe('ProductsManager', () => {
  const products: Product[] = [
    { id: 1, name: 'Maillot du club', productCategoryId: 3, categoryLabel: 'Textile', priceCents: 1000, stock: 0, active: true, parentId: null, variantCount: 2, ordersCount: 0, imageKey: 'media/abcd/produit-800.webp' },
    { id: 2, name: 'Maillot du club', productCategoryId: 3, categoryLabel: 'Textile', priceCents: 1000, stock: 0, active: true, parentId: 1, variantLabel: 'S', ordersCount: 0 },
    { id: 3, name: 'Maillot du club', productCategoryId: 3, categoryLabel: 'Textile', priceCents: 1200, stock: 4, trackStock: true, active: false, parentId: 1, variantLabel: 'L', ordersCount: 3 },
    { id: 4, name: 'Yonex BG65', productCategoryId: 2, categoryLabel: 'Cordages', priceCents: 1550, stock: 0, active: true, parentId: null, ordersCount: 6 }
  ];
  const productCategories = [{ id: 2, label: 'Cordages' }, { id: 3, label: 'Textile' }];

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  const mountManager = (target: HTMLElement) =>
    mount(ProductsManager, { target, props: { products, productCategories, mediaOrigin: 'https://site.example', canWrite: true } });

  it('affiche les produits, leurs déclinaisons en retrait, et la vignette du parent', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    mountManager(target);
    flushSync();

    const html = target.innerHTML;
    expect(html).toContain('Maillot du club');
    expect(html).toContain('2 déclinaisons');
    expect(html).toContain('selon déclinaison');
    expect(html).toContain('Yonex BG65');
    expect(html).toContain('15,50');
    expect(html).toContain('Textile');
    expect(html).toContain('Cordages');
    expect(html).toContain('https://site.example/media/abcd/produit-800.webp');
    expect(html).toContain('Actif');
    expect(html).toContain('Inactif');
  });

  it('garde la famille entière quand la recherche touche une déclinaison', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    mountManager(target);
    flushSync();

    const search = target.querySelector('input[type="search"], input[placeholder="Rechercher un article..."]') as HTMLInputElement;
    search.value = 'Maillot du club — L';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();

    const rows = Array.from(target.querySelectorAll('tbody tr'));
    expect(rows.map((r) => r.textContent?.replace(/\s+/g, ' ').trim())).toEqual(
      expect.arrayContaining([expect.stringContaining('Maillot du club'), expect.stringContaining('S'), expect.stringContaining('L')])
    );
    expect(target.innerHTML).not.toContain('Yonex BG65');
  });

  it('ouvre la fiche vierge, puis une fiche de déclinaison préremplie', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    mountManager(target);
    flushSync();

    const add = Array.from(target.querySelectorAll('button')).find((b) => b.textContent?.includes('Nouveau produit')) as HTMLButtonElement;
    add.click();
    flushSync();
    await vi.waitFor(() => expect(document.body.textContent).toContain('Renseignez le nom, la catégorie et le prix.'));
    expect(document.body.innerHTML).toContain('Choisir une image');
    expect(document.body.textContent).toContain('Catégorie');
  });
});
