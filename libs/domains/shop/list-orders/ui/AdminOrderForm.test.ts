import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import AdminOrderForm from './AdminOrderForm.svelte';

/*
  La correction d'une commande s'ouvrait sur la seule catégorie de l'article commandé,
  sans champ pour en changer : une commande de cordage ne pouvait pas devenir une
  commande de maillot. Elle a dû être annulée et ressaisie.
*/
const produits = [
  { id: 1, name: 'Yonex BG65', displayName: 'Yonex BG65', productCategoryId: 10, categoryLabel: 'Cordages', priceCents: 1550, stock: 0, trackStock: false, active: true, variantCount: 0 },
  { id: 34, name: 'Maillot homme', displayName: 'Maillot homme', productCategoryId: 20, categoryLabel: 'Textile', priceCents: 1000, stock: 0, trackStock: false, active: true, variantCount: 1 },
  { id: 24, name: 'Maillot homme', displayName: 'Maillot homme — M', productCategoryId: 20, categoryLabel: 'Textile', priceCents: 1000, stock: 0, trackStock: false, active: true, parentId: 34, variantLabel: 'M', variantCount: 0 }
];

const commande = {
  order: { id: 7, memberId: 5, productId: 1, quantity: 1, status: 'created', paymentMethod: 'virement' }
} as any;

describe('AdminOrderForm', () => {
  let app: Record<string, any> | null = null;
  afterEach(() => {
    if (app) unmount(app);
    app = null;
    document.body.innerHTML = '';
  });

  it("propose tout le catalogue en correction, et pas seulement la catégorie de l'article commandé", async () => {
    app = mount(AdminOrderForm, {
      target: document.body,
      props: {
        open: true,
        products: produits as any,
        members: [{ id: 5, firstName: 'Antoine', lastName: 'Yoann', licence: '123' }],
        activeSeasonId: '26-27',
        paymentMethods: [{ value: 'virement', label: 'Virement', kind: 'transfer' }],
        commande
      }
    });
    flushSync();
    await tick();

    const declencheur = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Yonex BG65'));
    expect(declencheur, "l'article commandé n'est pas présélectionné").not.toBeUndefined();
    declencheur!.click();
    flushSync();
    await tick();

    const texte = document.body.textContent ?? '';
    expect(texte).toContain('Maillot homme — M');
    // Le parent à déclinaisons ne se commande pas : seule sa taille est proposée.
    expect(texte).not.toMatch(/Maillot homme — 10,00/);
  });
});
