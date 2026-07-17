import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import ShopCatalog from './ShopCatalog.svelte';

describe('ShopCatalog Component', () => {
  const members = [
    { id: 1, firstName: 'Jean', lastName: 'Dupont', licence: '123456' },
    { id: 2, firstName: 'Alice', lastName: 'Martin', licence: '654321' }
  ];

  const products = [
    { id: 10, name: 'Volant RSL Grade 1', category: 'shuttlecock' as const, price: 1500, stock: 10, active: true },
    { id: 11, name: 'Cordage Yonex BG65', category: 'string' as const, price: 2000, stock: 5, active: true }
  ];

  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 100 } })
      } as any)
    );
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    global.fetch = originalFetch;
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

    // Check title/header elements
    expect(target.innerHTML).toContain("Qui effectue l'achat ?");
    expect(target.innerHTML).toContain("Articles Disponibles");

    // Check products rendered
    expect(target.innerHTML).toContain("Volant RSL Grade 1");
    expect(target.innerHTML).toContain("15.00 €");
 
    expect(target.innerHTML).toContain("Cordage Yonex BG65");
    expect(target.innerHTML).toContain("20.00 €");
  });

  it('allows member selection from combobox', async () => {
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

    // Input element
    const input = target.querySelector('input#member-input') as HTMLInputElement;
    expect(input).not.toBeNull();

    // Focus input to open dropdown
    input.focus();
    flushSync();

    // Check if dropdown options are visible
    expect(target.innerHTML).toContain('Dupont Jean');
    expect(target.innerHTML).toContain('Martin Alice');

    // Click/mousedown to select Jean Dupont
    const buttons = Array.from(target.querySelectorAll('button'));
    const jeanBtn = buttons.find(b => b.textContent?.includes('Dupont Jean'));
    expect(jeanBtn).not.toBeUndefined();

    // Trigger mousedown
    jeanBtn!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    flushSync();

    // Check badge updates
    expect(target.innerHTML).toContain('Adhérent sélectionné : <span class="underline">Dupont Jean</span>');
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

    // Select Jean Dupont
    const input = target.querySelector('input#member-input') as HTMLInputElement;
    input.focus();
    flushSync();
    const jeanBtn = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.includes('Dupont Jean'));
    jeanBtn!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    flushSync();

    // Click "Commander" for first product (Volant RSL Grade 1, id: 10)
    const commanderButtons = Array.from(target.querySelectorAll('button')).filter(
      b => b.textContent?.trim().includes('Commander')
    );
    expect(commanderButtons.length).toBe(2);

    // Click the first one
    commanderButtons[0].click();
    flushSync();

    // Expect fetch to be called with correct body
    expect(global.fetch).toHaveBeenCalledWith('', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        seasonId: '25-26',
        memberId: 1, // Jean Dupont's ID
        productId: 10, // Volant RSL Grade 1 ID
        quantity: 1,
        paymentMethod: 'virement',
        turnstileToken: 'mock-test-token'
      })
    });

    await vi.runAllTimersAsync();
    flushSync();

    // Check success message is displayed
    expect(target.innerHTML).toContain(
      "Votre souhait d'achat de 1 Volant RSL Grade 1 a bien été enregistré. Il sera comptabilisé dès validation par le trésorier."
    );

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

    // Keydown ArrowDown to highlight first element (Dupont Jean)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    flushSync();

    // Verify option 0 is highlighted (has bg-primary/10 class or similar)
    const option0 = target.querySelector('#member-option-0');
    expect(option0?.className).toContain('bg-primary/10');

    // Keydown ArrowDown to highlight second element (Martin Alice)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    flushSync();

    const option1 = target.querySelector('#member-option-1');
    expect(option1?.className).toContain('bg-primary/10');
    expect(option0?.className).not.toContain('bg-primary/10');

    // Keydown Enter to select
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    flushSync();

    // Verify selection was made
    expect(target.innerHTML).toContain('Adhérent sélectionné : <span class="underline">Martin Alice</span>');
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

    // Keydown Escape
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

    // Select Jean Dupont first
    const input = target.querySelector('input#member-input') as HTMLInputElement;
    input.focus();
    flushSync();
    
    const jeanBtn = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.includes('Dupont Jean'));
    jeanBtn!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    flushSync();

    // Blur input
    input.blur();
    flushSync();

    // Value should equal Jean Dupont's display name
    expect(input.value).toBe('Dupont Jean');

    // Mock HTMLInputElement.select
    const selectSpy = vi.spyOn(input, 'select');

    // Focus input again
    input.focus();
    flushSync();

    // Input value should still be preserved
    expect(input.value).toBe('Dupont Jean');
    expect(selectSpy).toHaveBeenCalled();
  });

  it('renders products using Card components and member selection with Label and Input', () => {
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

    // Check that Card components are used (data-slot="card")
    const cardRoots = target.querySelectorAll('[data-slot="card"]');
    expect(cardRoots.length).toBe(2);

    // Verify card titles (data-slot="card-title")
    const cardTitles = Array.from(target.querySelectorAll('[data-slot="card-title"]'));
    expect(cardTitles.some(el => el.textContent?.includes('Volant RSL Grade 1'))).toBe(true);
    expect(cardTitles.some(el => el.textContent?.includes('Cordage Yonex BG65'))).toBe(true);

    // Verify Label and Input are used for member search
    const labels = Array.from(target.querySelectorAll('[data-slot="label"]'));
    expect(labels.some(el => el.textContent?.includes("Qui effectue l'achat ?"))).toBe(true);

    const input = target.querySelector('input#member-input[data-slot="input"]');
    expect(input).not.toBeNull();
  });
});
