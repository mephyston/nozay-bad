import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import ShopCatalog from './ShopCatalog.svelte';

// NOTE (migration Design System) : la sélection d'acheteur, de mode de paiement,
// de catégorie et de produit passe désormais par le composant SearchableCombobox.
// La plupart des tests couvrent le comportement observable du catalogue sans
// piloter l'intérieur des combobox ; le dernier test vérifie la recherche
// dynamique d'adhérents par API (restaurée via SearchableCombobox en mode
// recherche externe : filter=false + onSearch).

describe('ShopCatalog Component', () => {
  const members = [
    { id: 1, firstName: 'Jean', lastName: 'Dupont', licence: '123456' },
    { id: 2, firstName: 'Alice', lastName: 'Martin', licence: '654321' }
  ];

  const products = [
    { id: 10, name: 'Volant RSL Grade 1', productCategoryId: 1, priceCents: 1500, stock: 10, active: true },
    { id: 11, name: 'Cordage Yonex BG65', productCategoryId: 2, priceCents: 2000, stock: 5, active: true }
  ];

  const mountCatalog = (target: HTMLElement) =>
    mount(ShopCatalog, { target, props: { members, products, activeSeasonId: '25-26' } });

  const norm = (h: string) => h.replace(/&nbsp;|[  ]/g, ' ');

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: { id: 100 } }) } as any)
    ));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the catalog structure with selection comboboxes', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mountCatalog(target);
    flushSync();

    expect(target.innerHTML).toContain('Boutique');
    expect(target.innerHTML).toContain('Mode de paiement');

    // Acheteur, produit (unique, groupé par type), mode de paiement : trois combobox
    expect(target.querySelectorAll('[role="combobox"]').length).toBe(3);

    // Sans acheteur sélectionné, l'invite de sélection est affichée
    expect(target.innerHTML).toContain("Sélectionnez votre nom d'adhérent");
  });

  it('shows the total for the default product and updates it with the quantity', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mountCatalog(target);
    flushSync();

    // Produit par défaut auto-sélectionné (Volant RSL, 15,00 € x 1)
    expect(norm(target.innerHTML)).toContain('15,00');

    const qtyInput = target.querySelector('input#quantity-input') as HTMLInputElement;
    expect(qtyInput).not.toBeNull();
    qtyInput.value = '3';
    qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();

    // Total pour 3 Volants RSL (45,00 €)
    expect(norm(target.innerHTML)).toContain('45,00');
  });

  it('blocks submission until an adherent is selected', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mountCatalog(target);
    flushSync();

    const submitBtn = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.includes('Valider la commande')
    ) as HTMLButtonElement | undefined;
    expect(submitBtn).toBeDefined();
    // Aucun adhérent sélectionné → soumission désactivée
    expect(submitBtn!.disabled).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('performs dynamic adherent search via the API when the members list is empty', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: 7, firstName: 'Zoé', lastName: 'Testeur', licence: '999999' }])
    });
    vi.stubGlobal('fetch', fetchMock);

    const target = document.createElement('div');
    document.body.appendChild(target);

    // Cas storefront : aucun adhérent préchargé — la recherche passe par l'API.
    mount(ShopCatalog, { target, props: { members: [], products, activeSeasonId: '25-26' } });
    flushSync();

    // Ouvrir le combobox acheteur (premier combobox) et saisir une requête.
    const combo = target.querySelector('[role="combobox"]') as HTMLButtonElement;
    combo.click();
    flushSync();
    await new Promise((r) => setTimeout(r, 60));
    flushSync();

    const searchInput = document.querySelector('[data-slot="command-input"]') as HTMLInputElement;
    expect(searchInput).not.toBeNull();
    searchInput.value = 'dup';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
    await new Promise((r) => setTimeout(r, 400)); // debounce de la recherche
    flushSync();

    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/api/members-search'))).toBe(true);
  });
});
