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
    // Les boîtes modales sortent du conteneur monté (portail) : sans ce nettoyage,
    // celle d'un test précédent reste dans le document et se fait interroger à la
    // place de celle du test courant.
    document.body.innerHTML = '';
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

  it('explains why submission is blocked instead of only greying the button', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mountCatalog(target);
    flushSync();

    expect(target.innerHTML).toContain("Sélectionnez l'adhérent pour lequel commander.");
  });

  it('keeps products orderable when their stock is not tracked (stock = 0 par convention)', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    // Cas staging « Babolat 2 » : trackStock = false, stock = 0 → commandable.
    mount(ShopCatalog, {
      target,
      props: {
        members,
        products: [{ id: 20, name: 'Babolat 2', productCategoryId: 1, priceCents: 3150, stock: 0, trackStock: false, active: true }],
        activeSeasonId: '25-26',
        lockToMembers: true,
        initialMemberId: '1'
      }
    });
    flushSync();

    const submitBtn = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.includes('Valider la commande')
    ) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
    expect(target.innerHTML).not.toContain('rupture de stock');
  });

  it('hides tracked products that are out of stock and says how many', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ShopCatalog, {
      target,
      props: {
        members,
        products: [
          { id: 30, name: 'Volant RSL Grade 1', productCategoryId: 1, priceCents: 1500, stock: 10, trackStock: true, active: true },
          { id: 31, name: 'Volant épuisé', productCategoryId: 1, priceCents: 1500, stock: 0, trackStock: true, active: true }
        ],
        activeSeasonId: '25-26',
        lockToMembers: true,
        initialMemberId: '1'
      }
    });
    flushSync();

    expect(target.innerHTML).not.toContain('Volant épuisé');
    expect(target.innerHTML).toContain("1 article en rupture de stock n'est pas proposé à la commande.");
  });

  /*
   * La commande enregistrée se confirme en boîte modale.
   *
   * L'encart vert sous le bouton passait sous la ligne de flottaison sur mobile, et
   * laissait le formulaire tel quel : rien ne distinguait une commande partie d'un
   * formulaire simplement rempli.
   */
  describe('confirmation de commande', () => {
    const mountOrderable = (target: HTMLElement) =>
      mount(ShopCatalog, {
        target,
        props: { members, products, activeSeasonId: '25-26', lockToMembers: true, initialMemberId: '1' }
      });

    const submit = async (target: HTMLElement) => {
      const btn = Array.from(target.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Valider la commande')
      ) as HTMLButtonElement;
      btn.click();
      await vi.waitFor(() => {
        expect(document.querySelector('[data-testid="order-confirmation"]')).not.toBeNull();
      });
      flushSync();
      return document.querySelector('[data-testid="order-confirmation"]') as HTMLElement;
    };

    const okButton = (dialog: HTMLElement) =>
      Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'OK') as HTMLButtonElement;

    it("récapitule la commande dans une boîte modale plutôt qu'un encart", async () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      mountOrderable(target);
      flushSync();
      const dialog = await submit(target);

      expect(dialog.textContent).toContain('Commande enregistrée');
      expect(dialog.textContent).toContain('Volant RSL Grade 1');
      expect(norm(dialog.innerHTML)).toContain('15,00');
    });

    it("dit où remettre l'argent quand le paiement est en espèces", async () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      mountOrderable(target);
      flushSync();

      // Mode de paiement = espèces (troisième combobox).
      const paymentCombo = target.querySelectorAll('[role="combobox"]')[1] as HTMLButtonElement;
      paymentCombo.click();
      flushSync();
      await vi.waitFor(() => {
        expect(document.querySelector('[data-slot="command-input"]')).not.toBeNull();
      });
      const especes = Array.from(document.querySelectorAll('[data-slot="command-item"]')).find(
        (el) => el.textContent?.trim() === 'Espèces'
      ) as HTMLElement;
      expect(especes).toBeDefined();
      especes.click();
      flushSync();

      const dialog = await submit(target);
      expect(dialog.textContent).toContain('à votre entraîneur ou au trésorier');
    });

    it("ne parle d'espèces que pour un paiement en espèces", async () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      mountOrderable(target);
      flushSync();
      const dialog = await submit(target);

      expect(dialog.textContent).not.toContain('à votre entraîneur ou au trésorier');
    });

    it('remet le formulaire à zéro quand la confirmation est acquittée', async () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      mountOrderable(target);
      flushSync();

      const qtyInput = target.querySelector('input#quantity-input') as HTMLInputElement;
      qtyInput.value = '3';
      qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
      flushSync();
      expect(norm(target.innerHTML)).toContain('45,00');

      const dialog = await submit(target);
      okButton(dialog).click();
      await vi.waitFor(() => {
        expect(document.querySelector('[data-testid="order-confirmation"]')).toBeNull();
      });
      flushSync();

      const qtyAfter = target.querySelector('input#quantity-input') as HTMLInputElement;
      expect(qtyAfter.value).toBe('1');
      expect(norm(target.innerHTML)).toContain('15,00');
    });
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
