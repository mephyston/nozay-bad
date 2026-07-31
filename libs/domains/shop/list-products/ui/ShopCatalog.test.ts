import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import ShopCatalog from './ShopCatalog.svelte';

// NOTE (migration Design System) : la sélection d'acheteur, de mode de paiement,
// de catégorie et de produit passe désormais par le composant SearchableCombobox
// (menu déroulant en portail). Le rendu des options n'est présent dans le DOM
// qu'à l'ouverture du menu, et l'ouverture d'un Popover bits-ui n'est pas
// fiable sous jsdom. Ces tests couvrent donc le comportement observable du
// catalogue sans piloter l'intérieur des combobox ; l'interaction fine des
// combobox relève des tests du composant @nba/ui lui-même.
//
// Régression connue à traiter séparément : la recherche d'adhérents par API
// (fetch dynamique quand la prop `members` est vide) est devenue du code mort
// après la migration vers SearchableCombobox — le combobox filtre la liste
// fournie côté client et ne met plus à jour `memberSearchQuery`.

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
    expect(target.innerHTML).toContain('Article &amp; Quantité');

    // Acheteur, mode de paiement, catégorie, produit : quatre combobox de sélection
    expect(target.querySelectorAll('[role="combobox"]').length).toBe(4);

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
});
