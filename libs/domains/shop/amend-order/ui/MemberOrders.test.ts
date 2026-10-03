import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import MemberOrders from './MemberOrders.svelte';
import type { MemberOrderRow } from './member-orders-actions';

/**
 * « Mes commandes » : modifier ou annuler, et seulement tant que le bureau n'a rien validé.
 */
describe('MemberOrders', () => {
  const member = { id: 9, firstName: 'Léa', lastName: 'Garnier', licence: '112233' };

  const products = [
    { id: 33, name: 'Maillot du club', productCategoryId: 3, priceCents: 2500, stock: 0, active: true, parentId: null, variantCount: 2 },
    { id: 34, name: 'Maillot du club', productCategoryId: 3, priceCents: 2500, stock: 4, trackStock: true, active: true, parentId: 33, variantLabel: 'M' },
    { id: 35, name: 'Maillot du club', productCategoryId: 3, priceCents: 2500, stock: 4, trackStock: true, active: true, parentId: 33, variantLabel: 'L' }
  ] as any[];

  const paymentMethods = [
    { value: 'especes', label: 'Espèces', kind: 'cash' as const },
    { value: 'cheque', label: 'Chèque', kind: 'cheque' as const }
  ];

  const ligne = (over: Partial<MemberOrderRow>): MemberOrderRow => ({
    id: 1,
    memberId: 9,
    productId: 35,
    productName: 'Maillot du club — L',
    quantity: 2,
    totalCents: 5000,
    paymentMethod: 'cheque',
    status: 'created',
    createdAt: '2026-09-20T10:00:00.000Z',
    rejectionReason: null,
    statutLabel: 'En attente de validation',
    statutClasse: '',
    ...over
  });

  let app: ReturnType<typeof mount> | null = null;
  const monter = (orders: MemberOrderRow[]) => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(MemberOrders, { target, props: { orders, products, member, paymentMethods, activeSeasonId: '26-27' } });
    flushSync();
    return target;
  };
  const bouton = (root: Element, label: string) =>
    Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim() === label) as HTMLButtonElement | undefined;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) }));
  });

  afterEach(() => {
    if (app) unmount(app);
    app = null;
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it("n'offre « Modifier » et « Annuler » qu'aux commandes que le bureau n'a pas validées", () => {
    const target = monter([
      ligne({ id: 1 }),
      ligne({ id: 2, status: 'awaiting_payment', statutLabel: 'À régler' }),
      ligne({ id: 3, status: 'paid', statutLabel: 'Payée, à retirer' })
    ]);

    const lignes = Array.from(target.querySelectorAll('[data-testid="member-orders"] > div'));
    expect(lignes).toHaveLength(3);
    expect(bouton(lignes[0], 'Modifier')).toBeDefined();
    expect(bouton(lignes[0], 'Annuler')).toBeDefined();
    for (const l of lignes.slice(1)) {
      expect(bouton(l, 'Modifier')).toBeUndefined();
      expect(bouton(l, 'Annuler')).toBeUndefined();
    }
  });

  it("ne propose pas de modifier un article retiré du catalogue, mais laisse l'annuler", () => {
    const target = monter([ligne({ productId: 99, productName: 'Ancien article' })]);
    expect(bouton(target, 'Modifier')).toBeUndefined();
    expect(bouton(target, 'Annuler')).toBeDefined();
  });

  it('rouvre la feuille de commande sur la commande : sa taille, sa quantité', async () => {
    const target = monter([ligne({})]);
    bouton(target, 'Modifier')!.click();
    flushSync();
    await new Promise((r) => setTimeout(r, 0));

    const feuille = document.querySelector('[data-testid="order-dialog"]') as HTMLElement;
    expect(feuille).not.toBeNull();
    const taille = Array.from(feuille.querySelectorAll('[data-testid="variant-choice"]')).find(
      (b) => b.getAttribute('aria-checked') === 'true'
    );
    expect(taille?.textContent).toContain('L');
    expect((feuille.querySelector('#order-quantity') as HTMLInputElement).value).toBe('2');
    expect(document.body.textContent).toContain('Enregistrer les modifications');
  });
});
