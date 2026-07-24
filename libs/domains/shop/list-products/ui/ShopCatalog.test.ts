import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import ShopCatalog from './ShopCatalog.svelte';

describe('ShopCatalog Component', () => {
  const members = [
    { id: 1, firstName: 'Jean', lastName: 'Dupont', licence: '123456' },
    { id: 2, firstName: 'Alice', lastName: 'Martin', licence: '654321' }
  ];

  const products = [
    { id: 10, name: 'Volant RSL Grade 1', productCategoryId: 1, priceCents: 1500, stock: 10, active: true },
    { id: 11, name: 'Cordage Yonex BG65', productCategoryId: 2, priceCents: 2000, stock: 5, active: true }
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 100 } })
      } as any)
    ));
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders member selection and active products', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ShopCatalog, {
      target,
      props: {
        members,
        products,
        activeSeasonId: '25-26'
      }
    });
    flushSync();

    expect(target.innerHTML).toContain("Boutique Club");
    expect(target.innerHTML).toContain("Article &amp; Quantité");

    expect(target.innerHTML).toContain("Volant RSL Grade 1");
    expect(target.innerHTML).toContain("15.00 €");

    expect(target.innerHTML).toContain("Cordage Yonex BG65");
  });

  it('allows member selection from combobox with privacy masking', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ShopCatalog, {
      target,
      props: {
        members,
        products,
        activeSeasonId: '25-26'
      }
    });

    const input = target.querySelector('input#member-input') as HTMLInputElement;
    expect(input).not.toBeNull();

    input.focus();
    flushSync();

    expect(target.innerHTML).toContain('D. Jean');
    expect(target.innerHTML).toContain('M. Alice');

    const buttons = Array.from(target.querySelectorAll('button'));
    const jeanBtn = buttons.find(b => b.textContent?.includes('D. Jean'));
    expect(jeanBtn).not.toBeUndefined();

    jeanBtn!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    flushSync();

    expect(target.innerHTML).toContain('Adhérent sélectionné : <span class="font-bold">D. Jean</span>');
  });

  it('submits purchase wish and displays success feedback', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ShopCatalog, {
      target,
      props: {
        members,
        products,
        activeSeasonId: '25-26'
      }
    });

    const input = target.querySelector('input#member-input') as HTMLInputElement;
    input.focus();
    flushSync();
    const jeanBtn = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.includes('D. Jean'));
    jeanBtn!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    flushSync();

    const submitBtn = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.trim().includes('Valider la commande')
    );
    expect(submitBtn).not.toBeUndefined();

    submitBtn!.click();
    flushSync();

    expect(globalThis.fetch).toHaveBeenCalledWith('', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        seasonId: '25-26',
        memberId: 1,
        productId: 10,
        quantity: 1,
        paymentMethod: 'virement',
        turnstileToken: 'mock-test-token'
      })
    });

    await vi.runAllTimersAsync();
    flushSync();

    expect(target.innerHTML).toContain(
      "Votre souhait d'achat de 1 Volant RSL Grade 1 a bien été enregistré. Il sera comptabilisé dès validation par le trésorier."
    );
  });

  it('filters product dropdown when category changes', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ShopCatalog, {
      target,
      props: {
        members,
        products,
        activeSeasonId: '25-26'
      }
    });
    flushSync();

    const categorySelect = target.querySelector('select#category-select') as unknown as HTMLSelectElement;
    expect(categorySelect).not.toBeNull();

    categorySelect.value = '2';
    categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
    flushSync();

    const productSelect = target.querySelector('select#product-select') as unknown as HTMLSelectElement;
    const options = Array.from(productSelect.querySelectorAll('option'));
    expect(options.length).toBe(1);
    expect(options[0].textContent).toContain('Cordage Yonex BG65');
  });

  it('updates total price dynamically when quantity or product changes', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ShopCatalog, {
      target,
      props: {
        members,
        products,
        activeSeasonId: '25-26'
      }
    });
    flushSync();

    // Default total for 1 Volant RSL (15.00 €)
    expect(target.innerHTML).toContain('15.00 €');

    const qtyInput = target.querySelector('input#quantity-input') as HTMLInputElement;
    qtyInput.value = '3';
    qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();

    // Total for 3 Volant RSL (45.00 €)
    expect(target.innerHTML).toContain('45.00 €');
  });

  it('supports keyboard navigation through the members listbox', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ShopCatalog, {
      target,
      props: {
        members,
        products,
        activeSeasonId: '25-26'
      }
    });
    flushSync();

    const input = target.querySelector('input#member-input') as HTMLInputElement;
    input.focus();
    flushSync();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    flushSync();

    const option0 = target.querySelector('#member-option-0');
    expect(option0?.className).toContain('bg-primary/10');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    flushSync();

    const option1 = target.querySelector('#member-option-1');
    expect(option1?.className).toContain('bg-primary/10');
    expect(option0?.className).not.toContain('bg-primary/10');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    flushSync();

    expect(target.innerHTML).toContain('Adhérent sélectionné : <span class="font-bold">M. Alice</span>');
  });

  it('closes dropdown list on Escape key', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ShopCatalog, {
      target,
      props: {
        members,
        products,
        activeSeasonId: '25-26'
      }
    });
    flushSync();

    const input = target.querySelector('input#member-input') as HTMLInputElement;
    input.focus();
    flushSync();

    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(target.querySelector('#member-listbox')).not.toBeNull();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    flushSync();

    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(target.querySelector('#member-listbox')).toBeNull();
  });

  it('selects all text on focus without clearing if member is selected', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ShopCatalog, {
      target,
      props: {
        members,
        products,
        activeSeasonId: '25-26'
      }
    });
    flushSync();

    const input = target.querySelector('input#member-input') as HTMLInputElement;
    input.focus();
    flushSync();

    const jeanBtn = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.includes('D. Jean'));
    jeanBtn!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    flushSync();

    input.blur();
    flushSync();

    expect(input.value).toBe('D. Jean');

    const selectSpy = vi.spyOn(input, 'select');

    input.focus();
    flushSync();

    expect(input.value).toBe('D. Jean');
    expect(selectSpy).toHaveBeenCalled();
  });

  it('renders Card layout components', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ShopCatalog, {
      target,
      props: {
        members,
        products,
        activeSeasonId: '25-26'
      }
    });
    flushSync();

    const cardRoots = target.querySelectorAll('[data-slot="card"]');
    expect(cardRoots.length).toBeGreaterThanOrEqual(1);

    const cardTitles = Array.from(target.querySelectorAll('[data-slot="card-title"]'));
    expect(cardTitles.some(el => el.textContent?.includes('Boutique Club'))).toBe(true);

    const input = target.querySelector('input#member-input[data-slot="input"]');
    expect(input).not.toBeNull();
  });

  it('performs dynamic autocomplete search via API when members prop is empty', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const searchMembers = [
      { id: 3, firstName: 'Pierre', lastName: 'D.', licence: '78***12' }
    ];
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/members-search')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(searchMembers)
        } as any);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 100 } })
      } as any);
    }));

    mount(ShopCatalog, {
      target,
      props: {
        members: [],
        products,
        activeSeasonId: '25-26'
      }
    });
    flushSync();

    const input = target.querySelector('input#member-input') as HTMLInputElement;
    expect(input).not.toBeNull();

    input.focus();
    flushSync();

    input.value = 'Dubois';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();

    await vi.advanceTimersByTimeAsync(300);
    flushSync();

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/members-search?q=Dubois');

    expect(target.innerHTML).toContain('D. Pierre');
    expect(target.innerHTML).toContain('Licence: 78***12');

    const button = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.includes('D. Pierre'));
    expect(button).not.toBeUndefined();
    button!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    flushSync();

    expect(target.innerHTML).toContain('Adhérent sélectionné : <span class="font-bold">D. Pierre</span>');
  });

  it('clears fetched members when search query returns empty list', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/members-search')) {
        if (url.includes('q=Dubois')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 3, firstName: 'Pierre', lastName: 'D.', licence: '78***12' }])
          } as any);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        } as any);
      }
      return Promise.resolve({} as any);
    }));

    mount(ShopCatalog, {
      target,
      props: {
        members: [],
        products,
        activeSeasonId: '25-26'
      }
    });
    flushSync();

    const input = target.querySelector('input#member-input') as HTMLInputElement;
    input.focus();
    flushSync();

    input.value = 'Dubois';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();

    await vi.advanceTimersByTimeAsync(300);
    flushSync();

    expect(target.innerHTML).toContain('D. Pierre');

    input.value = 'UnknownUserXYZ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();

    await vi.advanceTimersByTimeAsync(300);
    flushSync();

    expect(target.innerHTML).toContain('Aucun adhérent trouvé');
  });
});
