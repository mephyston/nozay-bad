import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import ShopStorefront from './ShopStorefront.svelte';
import type { Product } from './catalog-types';

/**
 * La vitrine : des cartes, une boîte de commande, un accusé de réception.
 *
 * Les combobox ne sont pas pilotés de l'intérieur : le mode de paiement se
 * présélectionne sur le premier proposé, ce qui suffit à commander.
 */
describe('ShopStorefront', () => {
  const members = [{ id: 1, firstName: 'Jean', lastName: 'Dupont', licence: '123456' }];

  const products: Product[] = [
    { id: 10, name: 'Maillot du club', productCategoryId: 3, categoryLabel: 'Textile', priceCents: 1000, stock: 0, active: true, parentId: null, description: 'Le maillot officiel.', imageKey: 'media/abcd/produit-800.webp' },
    { id: 11, name: 'Maillot du club', productCategoryId: 3, categoryLabel: 'Textile', priceCents: 1000, stock: 0, active: true, parentId: 10, variantLabel: 'S' },
    { id: 12, name: 'Maillot du club', productCategoryId: 3, categoryLabel: 'Textile', priceCents: 1200, stock: 2, trackStock: true, active: true, parentId: 10, variantLabel: 'L' },
    { id: 13, name: 'Maillot du club', productCategoryId: 3, categoryLabel: 'Textile', priceCents: 1000, stock: 0, trackStock: true, active: true, parentId: 10, variantLabel: 'XL' },
    { id: 20, name: 'Volants RSL', productCategoryId: 1, categoryLabel: 'Volants', priceCents: 1980, stock: 0, active: true, parentId: null },
    { id: 30, name: 'Grip', productCategoryId: 3, categoryLabel: 'Textile', priceCents: 200, stock: 0, trackStock: true, active: true, parentId: null }
  ];

  const paymentMethods = [
    { value: 'especes', label: 'Espèces', kind: 'cash' as const },
    { value: 'virement', label: 'Virement', kind: 'transfer' as const }
  ];

  const mountStorefront = (target: HTMLElement, override: Partial<Record<string, unknown>> = {}) =>
    mount(ShopStorefront, {
      target,
      props: { members, products, paymentMethods, activeSeasonId: '25-26', initialMemberId: '1', historyHref: '/mon-compte#commandes', mediaOrigin: 'https://site.example', ...override }
    });

  const cards = (target: HTMLElement) => Array.from(target.querySelectorAll('[data-testid="product-card"]')) as HTMLButtonElement[];
  const dialog = () => document.querySelector('[data-testid="order-dialog"]') as HTMLElement | null;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: { id: 100 } }) } as any)
    ));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('affiche une carte par famille, avec image, prix et nombre de choix', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    mountStorefront(target);
    flushSync();

    const all = cards(target);
    expect(all).toHaveLength(3);
    expect(all[0].textContent).toContain('Maillot du club');
    expect(all[0].textContent).toContain('Le maillot officiel.');
    expect(all[0].textContent).toContain('3 choix');
    // Prix différents selon la déclinaison : « dès ».
    expect(all[0].textContent?.replace(/ | /g, ' ')).toContain('dès 10,00 €');
    expect(all[0].querySelector('img')?.getAttribute('src')).toBe('https://site.example/media/abcd/produit-800.webp');

    expect(all[1].textContent).toContain('Volants RSL');
    expect(all[1].textContent).not.toContain('choix');

    // Le grip est épuisé : affiché, mais pas commandable.
    expect(all[2].textContent).toContain('Rupture');
    expect(all[2].disabled).toBe(true);

    expect(target.querySelector('[data-testid="orders-history-link"]')?.getAttribute('href')).toBe('/mon-compte#commandes');
  });

  it('filtre les cartes par catégorie', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    mountStorefront(target);
    flushSync();

    const chips = Array.from(target.querySelectorAll('nav[aria-label="Catégories"] button')) as HTMLButtonElement[];
    expect(chips.map((c) => c.textContent?.trim())).toEqual(['Tout', 'Textile', 'Volants']);

    chips[2].click();
    flushSync();
    expect(cards(target)).toHaveLength(1);
    expect(cards(target)[0].textContent).toContain('Volants RSL');

    chips[0].click();
    flushSync();
    expect(cards(target)).toHaveLength(3);
  });

  it('ouvre la commande d’une famille, exige une déclinaison, puis commande la déclinaison choisie', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    mountStorefront(target);
    flushSync();

    cards(target)[0].click();
    flushSync();
    await vi.waitFor(() => expect(dialog()).not.toBeNull());

    const box = dialog()!;
    expect(box.textContent).toContain('Maillot du club');
    expect(box.textContent).toContain('D. Jean');
    const submit = box.querySelector('[data-testid="order-submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(box.textContent).toContain('Choisissez une déclinaison.');

    const choices = Array.from(box.querySelectorAll('[data-testid="variant-choice"]')) as HTMLButtonElement[];
    expect(choices.map((c) => c.textContent?.trim().split(/\s/)[0])).toEqual(['S', 'L', 'XL']);
    // XL est en rupture : proposée barrée, pas cliquable.
    expect(choices[2].disabled).toBe(true);

    choices[1].click();
    flushSync();
    expect(submit.disabled).toBe(false);
    expect(box.querySelector('[data-testid="order-total"]')?.textContent?.replace(/ | /g, ' ')).toBe('12,00 €');

    // La quantité est bornée par le stock de la déclinaison (2).
    const plus = box.querySelector('button[aria-label="Plus"]') as HTMLButtonElement;
    plus.click();
    flushSync();
    expect(box.querySelector('[data-testid="order-total"]')?.textContent?.replace(/ | /g, ' ')).toBe('24,00 €');
    expect(plus.disabled).toBe(true);

    submit.click();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    const body = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(body).toEqual({ seasonId: '25-26', memberId: 1, productId: 12, quantity: 2, paymentMethod: 'especes' });

    // La boîte de commande laisse place à l'accusé de réception, qui nomme la taille.
    await vi.waitFor(() => expect(document.querySelector('[data-testid="order-confirmation"]')).not.toBeNull());
    expect(document.querySelector('[data-testid="order-confirmation"]')?.textContent).toContain('Maillot du club — L');
  });

  it('commande directement un produit sans déclinaison', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    mountStorefront(target);
    flushSync();

    cards(target)[1].click();
    flushSync();
    await vi.waitFor(() => expect(dialog()).not.toBeNull());
    const box = dialog()!;
    expect(box.querySelectorAll('[data-testid="variant-choice"]')).toHaveLength(0);
    const submit = box.querySelector('[data-testid="order-submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(false);

    submit.click();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(JSON.parse((fetch as any).mock.calls[0][1].body).productId).toBe(20);
  });

  it('garde la boîte ouverte et affiche le refus du serveur', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ success: false, error: 'La saison est clôturée.' }) } as any));
    const target = document.createElement('div');
    document.body.appendChild(target);
    mountStorefront(target);
    flushSync();

    cards(target)[1].click();
    flushSync();
    await vi.waitFor(() => expect(dialog()).not.toBeNull());
    (dialog()!.querySelector('[data-testid="order-submit"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(dialog()?.textContent).toContain('La saison est clôturée.'));
    expect(document.querySelector('[data-testid="order-confirmation"]')).toBeNull();
  });

  it('dit quand rien n’est proposé', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    mountStorefront(target, { products: [] });
    flushSync();
    expect(target.textContent).toContain('Aucun article proposé pour le moment.');
  });
});
